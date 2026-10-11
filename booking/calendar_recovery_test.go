package main

import (
	"context"
	"reflect"
	"strconv"
	"sync"
	"testing"
)

func TestMissingCalendarRecoversWithAssignedAccountAndRestoresJobs(t *testing.T) {
	a, f, b := syncedGoogleBooking(t)
	ctx := context.Background()
	if err := a.google.connectAuthorized(ctx, "code", randomToken(48), a.cfg.AdminOrigin+"/oauth/callback", "owner-sub", nil, nil, true); err != nil {
		t.Fatal(err)
	}
	owner, _ := a.google.owner()
	var beforeMail mailGrant
	_ = a.store.getSecret("google_mail_tokens", &beforeMail)
	// Enabling emails must not turn calendar recovery into a customer update.
	emailSettings, _ := a.store.emailSettings()
	emailSettings.Enabled = true
	if err := a.store.putJSON("email_settings", emailSettings); err != nil {
		t.Fatal(err)
	}
	f.mu.Lock()
	f.calendarMissing = true
	f.mu.Unlock()
	// Concurrent automatic checks serialize around one calendar replacement.
	var wg sync.WaitGroup
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := a.google.Refresh(ctx, true); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	afterOwner, _ := a.google.owner()
	var afterMail mailGrant
	_ = a.store.getSecret("google_mail_tokens", &afterMail)
	if afterOwner.Sub != owner.Sub || afterOwner.Email != owner.Email || afterOwner.CalendarID == owner.CalendarID || !reflect.DeepEqual(beforeMail, afterMail) || f.creates != 2 {
		t.Fatal("recovery switched account/Gmail grant or created duplicate calendars")
	}
	saved, _ := a.store.booking(b.ID)
	if saved.Status != b.Status || saved.CalendarStatus != "pending" || saved.Start != b.Start || saved.End != b.End || saved.EventID != b.EventID {
		t.Fatal("empty replacement cancelled or changed a saved appointment")
	}
	a.syncDue(ctx)
	if err := a.google.Refresh(ctx, true); err != nil {
		t.Fatal(err)
	}
	saved, _ = a.store.booking(b.ID)
	if saved.Status != b.Status || saved.CalendarStatus != "synced" || len(f.events) != 1 || f.inserts != 2 {
		t.Fatal("saved appointment was not restored in the replacement")
	}
	if _, err := a.google.Busy(ctx, b.Start, b.End); err != nil || emailCount(t, a, "", "") != 0 {
		t.Fatal("recovered availability failed or recovery generated customer mail")
	}
}

func TestCalendarRecoveryDoesNotReplaceOnPermissionOrTemporaryErrors(t *testing.T) {
	for _, status := range []int{401, 403, 429, 500, 503} {
		t.Run(strconv.Itoa(status), func(t *testing.T) {
			a, f, b := syncedGoogleBooking(t)
			owner, _ := a.google.owner()
			f.calendarMissing, f.calendarStatus = true, status
			if err := a.google.Refresh(context.Background(), true); err == nil {
				t.Fatal("provider failure was accepted")
			}
			after, _ := a.google.owner()
			saved, _ := a.store.booking(b.ID)
			if after != owner || saved != b || f.creates != 1 {
				t.Fatal("permission/transient failure replaced calendar or altered jobs")
			}
			if err := a.google.connect(context.Background(), "code", randomToken(48), a.cfg.AdminOrigin+"/oauth/callback"); err == nil || f.creates != 1 {
				t.Fatal("reconnect replaced a calendar after a non-missing error")
			}
		})
	}
}

func TestMissingCalendarReconnectRestoresJobs(t *testing.T) {
	a, f, b := syncedGoogleBooking(t)
	f.calendarMissing = true
	if err := a.google.connectAuthorized(context.Background(), "code", randomToken(48), a.cfg.AdminOrigin+"/oauth/callback", "owner-sub", nil, nil, true); err != nil {
		t.Fatal(err)
	}
	a.syncDue(context.Background())
	saved, _ := a.store.booking(b.ID)
	assertCombinedGrant(t, a, "owner-sub")
	if saved.Status != b.Status || saved.CalendarStatus != "synced" || len(f.events) != 1 || f.creates != 2 {
		t.Fatal("reconnection did not restore the active appointment in one replacement calendar")
	}
}

func TestMissingCalendarKeepsCancelledJobsCancelled(t *testing.T) {
	a, f, b := syncedGoogleBooking(t)
	if _, err := a.patchBooking(b.ID, ptr("cancelled"), nil); err != nil {
		t.Fatal(err)
	}
	a.syncDue(context.Background())
	before, _ := a.store.booking(b.ID)
	f.calendarMissing = true
	if err := a.google.Refresh(context.Background(), true); err != nil {
		t.Fatal(err)
	}
	a.syncDue(context.Background())
	saved, _ := a.store.booking(b.ID)
	if saved != before || len(f.events) != 0 || f.inserts != 1 {
		t.Fatal("calendar recovery recreated or altered a cancelled appointment")
	}
}

func TestFailedCalendarReplacementPreservesConnectionAndCanRetry(t *testing.T) {
	a, f, b := syncedGoogleBooking(t)
	owner, _ := a.google.owner()
	f.calendarMissing, f.createStatus = true, 503
	if err := a.google.Refresh(context.Background(), true); err == nil {
		t.Fatal("failed creation reported success")
	}
	after, _ := a.google.owner()
	saved, _ := a.store.booking(b.ID)
	if after != owner || saved != b {
		t.Fatal("failed creation changed the saved calendar or appointment")
	}
	f.createStatus = 0
	if err := a.google.Refresh(context.Background(), true); err != nil {
		t.Fatal(err)
	}
	after, _ = a.google.owner()
	if after.CalendarID == owner.CalendarID {
		t.Fatal("recovery did not retry after provider recovered")
	}
}
