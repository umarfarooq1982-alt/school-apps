# API issues found while integrating the mobile app

Found while connecting the Parent, Student, Teacher and Owner/Admin apps to the
school API (Swagger at `/api/mobile/docs`). Checked against the live server and
the deployed backend code (`dist/`). The tables below describe the problems as
found; see the status table for what has since been fixed on the server.

Severity follows SOW 10.3: **Critical** (security, wrong money, data loss),
**High** (a main feature does not work), **Medium** (works with a workaround),
**Low** (docs, cosmetic).

## Status after the server fixes (3 Nov 2026)

The owner asked for these to be fixed on the server. Changes were made in the
deployed build (`/var/www/school/backend/dist`), tested on a temporary copy
first, then deployed with `pm2 reload`. A check script runs 36 tests against
the live server (fixes, tenant isolation and old endpoints); all pass.

> **Important for the backend developer:** the server has no git and its
> `src/` folder is older than `dist/` (the mobile module has no TypeScript
> source there). Running `npm run build` on the server would remove the mobile
> API. Port every change in `school-server-fixes-2026-11-03.diff` (kept in
> `/root/backups/` on the server) into your own source before the next deploy,
> or the fixes will be lost. Backups taken before the change:
> `/root/backups/school-dist-20261102-204040.tar.gz` and
> `/root/backups/school-db-20261102-204040.sql.gz`.

| Issue | Status |
|---|---|
| C1 complaints of other families | **Fixed** — parents see only complaints they raised (owner kept in `complaint-owner` records). Older complaints with no owner are hidden from parents. |
| C2 teacher opens any student | **Fixed** — 403 unless the student is in the teacher's class. |
| C3 teacher decides any leave | **Fixed** — own class only; the Approvals row is updated too. |
| C4 attendance for any class | **Fixed** — own class only; students must be in that class; marks P/A/L/LV only. |
| C5 grade any submission | **Fixed** — own class only; marks must be ≥ 0. |
| C6 health/pickup/certificates without studentId shown to all | **Fixed** — only the child's own rows. |
| H1 no refresh token | **Fixed** — login and OTP return `refreshToken` (7 days); `POST /api/mobile/auth/refresh` and `/api/auth/refresh` rotate it; logout and password reset revoke it. The app renews silently. |
| H2 web users not linked to staff | **Fixed** — `POST /api/web/users` and `PUT /api/web/users/{id}/access` accept `staffId` (same school, one login per staff). A real teacher login was created in SBS. |
| H3 mobile attendance empty | **Fixed** — month filter used `LIKE` on a date column; now a date range. Also fixes the teacher's own attendance month. |
| H4 transport shows first route | **Fixed** — uses the child's assignment (`transport-assign` records: `studentId`, `routeId`, `stop`); no assignment → no route. |
| H5 marks not validated | **Fixed** — 0 ≤ marks ≤ max on web and mobile; students must be in the school; teacher must teach the subject; closed marks entry is blocked for teachers. |
| H6 online payment | **Open** — needs the school's JazzCash / Easypaisa / 1Link merchant keys. |
| H7 UTC "today" | **Fixed** — today and weekday use Asia/Karachi (`SCHOOL_TZ` env var to change). |
| H8 shortage 500 | **Fixed** — returns 400 "classId is required"; works with a class. |
| H9 class-subjects 500 | **Fixed** — 400 without classId. Also fixed a tenant leak: any school could read/replace another school's class subjects. |
| H10 subject 500 | **Fixed** — "Theory + Practical" is saved as Both; unknown values get a 400. |
| M1 results position | **Fixed** — latest exam only (it added all exams together) and class position with ties. |
| M4 home subject names | **Fixed** — today's diary and periods include `subject`. |
| M5 library by name | **Fixed** — exact name or GR No. match. |
| M8 web diary/homework teacher id | **Fixed** — stores the staff id. |
| M9 leave days | **Fixed** — dates validated, days counted when not sent. |
| New: `POST /api/web/users` returned the password hash | **Fixed** — response no longer includes it. |
| New: marks could be written for another school's student | **Fixed** (with H5). |
| New: teacher homework listed once per subject | **Fixed** — once per class-section. |
| New: duplicate voucher number `V-26-000001` error in the log (BFS) | **Open** — voucher counter can repeat a number. |
| M2, M3, M6, M7, M10, M11, L1–L4 | **Open** — these need new features (date sheet per subject, period times, complaint replies, survey format, push sending, missing admin APIs, Swagger schemas). |

## Critical

| # | API | Problem | Effect in the app | Fix needed on the server |
|---|---|---|---|---|
| C1 | `GET /api/mobile/complaints` | Returns **every complaint in the school**, not only the signed-in parent's (`repo.complaints(schoolId)` has no parent filter). | A parent can read other families' complaints. | Filter by the parent's user id; store `parent_user_id` on create. |
| C2 | `GET /api/mobile/teacher/students/{id}` | Returns any student of the school; no check that the student is in the teacher's class. SOW M-17: "Teachers see only their own classes". | A teacher can open any student's profile, results and health notes. | Check the student is in one of the teacher's assignments/homerooms. |
| C3 | `POST /api/mobile/teacher/leaves/{id}/decide` | Decides any leave in the school; no check that it belongs to the teacher's class, and the linked approval row is not updated. | A teacher can approve leave of other classes; the Approvals inbox stays "pending". | Check class ownership; update the `Approval` row. |
| C4 | `POST /api/mobile/teacher/attendance` | Saves attendance for any `classId`; no check that the teacher teaches that class. | A teacher can overwrite another class's attendance. | Check the teacher's assignments. |
| C5 | `PUT /api/mobile/teacher/homework/{id}/grade` | Grades any submission in the school. | Same as above for marks. | Check the homework belongs to the teacher. |
| C6 | `GET /api/mobile/health`, `/pickup`, `/certificates` | Records saved without `studentId` are shown to **every** parent (`!(r.payload.studentId) \|\| …`). | Another family's data can appear. | Only return rows with the child's `studentId`. |

## High

| # | API | Problem | Effect in the app | Fix needed on the server |
|---|---|---|---|---|
| H1 | Login (`/api/mobile/auth/login`, `/otp/verify`) | Access token lives **20 minutes** and **no refresh token** is returned (one is saved in the DB but never sent). SOW 7.4 requires JWT with refresh tokens. | Users are signed out every 20 minutes. | Return a refresh token and add `POST /api/mobile/auth/refresh`. |
| H2 | `POST /api/web/users` | Never sets `staff_id` on the user, and no API links a user to a staff record. | A teacher login made from the web panel gets "This login has no staff profile" on **every** teacher API. Only seeded demo teachers work. | Accept `staffId` when creating a user, or create the login from the staff record. |
| H3 | `GET /api/mobile/attendance` | Returns no days even when attendance is saved (web roster for Class 5-A shows marks for 29 Oct – 2 Nov; the mobile month view for Oct and Nov is empty). | Parent/student attendance calendar and percentage are always empty. | Check `attendanceHeads` (month filter / campus). |
| H4 | `GET /api/mobile/transport` | Always returns the school's first route (`routes[0]`), not the child's route. | Every child shows the same route and driver. | Use the student's assigned route/stop. |
| H5 | `POST /api/mobile/teacher/marks`, `POST /api/web/marks` | No check that marks ≤ maximum (SOW M-12 key rule); no check `marks_open`, subject ownership or deadline. | Wrong marks can be saved if a client skips the check. | Validate on the server. |
| H6 | `POST /api/mobile/payments/online` | Gateways are hard-coded `enabled: false`; status is always `unavailable`. | Parents cannot pay online (S-09). | Enable JazzCash / Easypaisa / 1Link. |
| H7 | Server "today" | `todayIso()` uses UTC. Between 00:00 and 05:00 Pakistan time the server is still on the previous day: today's attendance is rejected as a "future date" and the day shown is wrong. | Early-morning attendance fails. | Use the school's time zone (Asia/Karachi). |
| H8 | `GET /api/web/attendance/shortage` | 500 error. | Attendance shortage list/report cannot load. | Fix the server error. |
| H9 | `GET /api/web/class-subjects` | 500 error. | Class–subject mapping cannot load. | Fix the server error. |
| H10 | `POST /api/web/academic/subjects` | 500 when `theoryPrac` is "Theory + Practical". | Practical subjects cannot be added from the app. | Validate the value and return 400 with a message. |

## Medium

| # | API | Problem | App behaviour |
|---|---|---|---|
| M1 | `GET /api/mobile/results` | `position` is always `null`; no remarks; grade bands are hard-coded, not from Exam setup. | Position and remarks hidden. |
| M2 | `GET /api/mobile/exams`, `/admit-card` | No per-subject date sheet, seats or syllabus; admit card is not held for fee defaulters. | App shows exam window only; the fee hold is checked in the app from `/fees`. |
| M3 | `GET /api/mobile/timetable` | Periods are numbers only — no start/end times, room or teacher name. | App shows "Period 1, 2…". |
| M4 | `GET /api/mobile/home` | `today.periods` and `today.diary` have subject ids but no subject names. | App looks names up from the timetable. |
| M5 | `GET /api/mobile/library` | Books are matched by **borrower name** (`LIKE %name%`), not student id. | Two children with similar names see each other's books. |
| M6 | `GET /api/mobile/complaints` | No reply thread or status history API. | Complaint detail shows the first message and status only. |
| M7 | `GET /api/mobile/surveys` | Surveys are free-form records; no question list format. | App reads `questions` from the record if present. |
| M8 | `POST /api/web/modules/diary` and `/homework` | Save `staff_id` / `teacher_id` = **user id**, while the mobile API saves the **staff id**. | Diary/homework made on the web are linked to the wrong teacher. |
| M9 | `POST /api/mobile/leave` | `days` defaults to 1 if the client does not send it. | App always sends the day count. |
| M10 | Notifications | `POST /api/mobile/auth/device` stores a token but nothing sends push messages; there is no list API for the bell. | Bell shows notices; real push needs FCM on the server. |
| M11 | Many admin screens | No API at all for: transport capacity / boarding, store stock / POS / purchases, exam setup / grading / seating / invigilation, salary setup / loans, hiring, exit & clearance, discount approval rules, templates, integrations, backup list. Generic `/api/web/modules/{key}` stores records but enforces no rules. | Those screens keep sample data and show a "no API yet" label. |

## Low

| # | Problem |
|---|---|
| L1 | Swagger has request examples only — no response schemas (every response is `data: any`). |
| L2 | Swagger `servers` URL is `http://`; the site runs on `https://`. |
| L3 | Swagger page `/api/mobile/docs` redirects to `/api/docs`. |
| L4 | Generic 500 message "Something went wrong" hides the reason; 4xx messages are good. |

## Batch 3 — tested on staging, for the backend developer to apply

These fixes passed the staging checks but are **not deployed**; the backend
developer applies them (see "For the backend developer" in the handover).

| Issue | Fix |
|---|---|
| **Critical** `PUT /api/web/staff/{id}` edits staff of another school | School check (404 for other schools). |
| **Critical** `PUT /api/web/modules/{key}/{id}` (generic records) updates another school's record | Record must match school and module. |
| **High** entry-test merit list shows every registration (and other schools' via `reg_ids`) | Only this school's candidates of the test's classes. |
| **High** discount and waiver requests never reach the Approvals inbox | Approval row created; student/voucher must be this school's. |
| **High** library issues a book with no free copy, ignores the issue limit; return can repeat and trusts the client's fine | Copies and limit checked; second return blocked; fine worked out on the server. |
| **Medium** leave calendar stops at the 28th | Real last day of the month. |
| **Medium** teachers cannot list exams for marks entry | `GET /api/mobile/exams` works for teachers. |

## Still open (found by the app work)

- Payroll generate ignores attendance, late, unpaid-leave and loan deductions; no approval or lock; re-running overwrites the month.
- Cash closing stores totals only, with no counted-vs-expected difference.
- `admit` does not check the Principal's approval; GR prefix is always `GR-MC-`; registration duplicate check is empty.
- `saveClass` replaces all sections (missing sections reset to "A", capacity 40).
- Model module updates overwrite whole rows (follow-up dates, complaint status, visitor in-time lost; campus set to null under "All campuses").
- Entry-test marks are not range-checked; tied candidates get different ranks.
- Approval decide ignores the note/reason; promotion has no dues carry-forward or history.
- Defaulters list includes Rs 0 vouchers; voucher search ignores student name/GR; collect accepts balance + Rs 1.
- `/teacher/homework` has no instructions or max marks; marks save has no "absent" flag; leave `days` comes back as a string.
- No list API for change requests; certificate request drops "needed for"; no complaint replies.
- Backup returns raw student/staff rows; restore covers module records only.
- Missing APIs: calendar edit/delete, session close, campus deactivate, `staffId` in the users list, period-wise attendance, salary setup, exit/clearance, canteen POS/wallet, stock, templates, scheduling, per-subject date sheet, online-payment gateway keys.
