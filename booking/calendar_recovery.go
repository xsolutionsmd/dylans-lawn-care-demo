package main

import (
	"context"
	"database/sql"
	"errors"
	"net/url"
)

var errCalendarMissing = errors.New("booking calendar not found")

// Call under ops.Lock. Only a definite not-found response permits replacement;
// permission failures and temporary Google errors must not create extra calendars.
func (g *Google) ensureBookingCalendar(ctx context.Context, owner Owner, token string) (Owner, bool, error) {
	replacing := owner.CalendarID != ""
	if replacing {
		var existing struct {
			ID string `json:"id"`
		}
		status, err := g.authorizedRequest(ctx, "GET", "/calendars/"+url.PathEscape(owner.CalendarID), nil, &existing, token)
		if err == nil {
			if existing.ID != owner.CalendarID {
				return owner, false, errGoogle
			}
			return owner, false, nil
		}
		if status != 404 && status != 410 {
			return owner, false, err
		}
	}
	settings, err := g.store.settings()
	if err != nil {
		return owner, false, err
	}
	var created struct {
		ID string `json:"id"`
	}
	_, err = g.authorizedRequest(ctx, "POST", "/calendars", map[string]string{"summary": settings.BusinessName + " bookings", "timeZone": settings.TimeZone}, &created, token)
	if err != nil || created.ID == "" || len(created.ID) > 1024 || created.ID == owner.CalendarID {
		return owner, false, errGoogle
	}
	owner.CalendarID = created.ID
	return owner, replacing, nil
}

// Save the new calendar and replay existing jobs in the same transaction. Mark
// them pending before any full snapshot of the empty replacement can run, so
// missing events cannot be mistaken for customer cancellations.
func (g *Google) resetCalendarSyncTx(tx *sql.Tx) error {
	if _, err := tx.Exec(`UPDATE bookings SET
calendar_status=CASE WHEN status='cancelled' THEN 'synced' ELSE 'pending' END,
generation=generation+1,
sync_generation=CASE WHEN status='cancelled' THEN generation+1 ELSE 0 END,
attempts=0,next_attempt=0
WHERE status!='cancelled' OR calendar_status!='synced'`); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM secrets WHERE key='calendar_cursor'"); err != nil {
		return err
	}
	_, err := tx.Exec("INSERT INTO meta(key,value) VALUES('google_error','\"\"'),('calendar_refresh_error','\"\"') ON CONFLICT(key) DO UPDATE SET value=excluded.value")
	return err
}

// Existing tokens already belong to the assigned owner. Recovery keeps that
// identity and Gmail grant; it never uses the identity of another signed-in user.
func (g *Google) recoverMissingCalendar(ctx context.Context) (Owner, error) {
	owner, err := g.owner()
	if err != nil || owner.Sub == "" || owner.CalendarID == "" {
		return owner, errGoogle
	}
	token, err := g.accessToken(ctx)
	if err != nil {
		return owner, err
	}
	owner, replaced, err := g.ensureBookingCalendar(ctx, owner, token)
	if err != nil {
		return owner, err
	}
	if !replaced {
		return owner, errGoogle
	}
	tx, err := g.store.db.BeginTx(ctx, nil)
	if err != nil {
		return owner, err
	}
	defer tx.Rollback()
	if err = g.store.writeTxSecret(tx, "owner", owner); err != nil {
		return owner, err
	}
	if err = g.resetCalendarSyncTx(tx); err != nil {
		return owner, err
	}
	return owner, tx.Commit()
}
