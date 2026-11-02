# API issues found while integrating the mobile app

Found while connecting the Parent, Student, Teacher and Owner/Admin apps to the
school API (Swagger at `/api/mobile/docs`). Checked against the live server and
the deployed backend code (`dist/`). Nothing on the server was changed.

Severity follows SOW 10.3: **Critical** (security, wrong money, data loss),
**High** (a main feature does not work), **Medium** (works with a workaround),
**Low** (docs, cosmetic).

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
