# Weekly Planner / Lich Tuan

## Goal
The **Weekly Planner** page helps users quickly review the training schedule for the current week by day and by session, so they can manage students and vehicles more efficiently.

The page must be visually clean, modern, lightweight, and easy to scan, while still showing all important operational details.

---

## Position in the system
- Add a new sidebar menu item: **Weekly Planner**
- Users must be able to access this page from the sidebar, similar to:
  - Dashboard
  - Students
- The sidebar active state must clearly highlight when the user is on the Weekly Planner page

---

## Purpose
This page is used to:
- view the weekly training schedule
- know which days have sessions and which days are empty
- view **morning / afternoon** sessions
- know which students are assigned on each day
- know whether each student is:
  - DAT training
  - yard practice
  - self-driving
- know which type of vehicle they use
- know which vehicle plate number they are assigned to

---

## Data source
The Weekly Planner page must load data from **a dedicated Google Sheet tab** through **Google Apps Script API**.

The page must display a full week from:
- Monday
- Tuesday
- Wednesday
- Thursday
- Friday
- Saturday
- Sunday

Each day must show:
- day name
- exact date (for example: 24/03/2026)
- 2 sessions:
  - Morning
  - Afternoon

---

## Required information in each session
Each schedule item must display at least:

- Student name
- Training type:
  - DAT
  - Yard practice
  - Self-driving
- Vehicle type:
  - Manual
  - Automatic
- License plate
- Short note if available

Optional fields if available in the sheet:
- Instructor / person in charge
- Training location
- Confirmation status

---

## UI/UX design requirements

### Overall layout
The Weekly Planner page should use:
- a page header
- a week navigation bar
- a weekly schedule grid
- each column represents one day
- each day is clearly divided into:
  - Morning
  - Afternoon

### Design style
The interface must be:
- modern
- clean
- bright
- spacious
- easy to scan
- not overly colorful
- not text-heavy
- not visually noisy
- not styled like a raw spreadsheet

### Display suggestions
- Each day should be displayed as a separate card or column
- The day name and exact date should appear in the card header
- Inside each day card, Morning and Afternoon must be clearly separated
- Each student entry should be shown as a compact card, block, or tag-like item
- Use small badges or pills to distinguish training type:
  - DAT
  - Yard practice
  - Self-driving
- Use subtle badges to distinguish vehicle type:
  - Manual
  - Automatic

### Visual tone
The design must feel:
- aesthetic
- clean admin dashboard
- light and readable
- minimal but not empty
- elegant without over-decoration

---

## Week navigation
The page must support navigating between weeks.

### Required controls
- **Previous week** button
- **Next week** button
- **Current week** button
- Clearly display the current week range  
  Example: `Week 24/03/2026 - 30/03/2026`

### Behavior
- By default, the page must open on the **current week**
- When the week changes, the page must reload data for that week only
- Do not preload many weeks at once

---

## Data states

### Loading state
- Use a lightweight skeleton or loading placeholder
- Do not block the entire page with a heavy full-screen loader
- The weekly layout should appear first, then data should populate asynchronously

### Empty session
- If a session has no data, show a clean empty state such as:
  - `No schedule yet`

### Empty day
- The day card must still be shown
- Both Morning and Afternoon sections must display their own empty states if no data exists

### Error state
- Show a short, friendly error message if data loading fails
- Include a retry action if appropriate

---

## Suggested Google Sheets structure
Use one dedicated Google Sheet tab for weekly schedule data.  
Each row represents one schedule record.

### Suggested columns
- id
- date
- day_of_week
- session
- student_name
- training_type
- car_type
- license_plate
- teacher_name
- location
- note

### Data conventions
- `session`: `morning` / `afternoon`
- `training_type`: `DAT` / `YARD_PRACTICE` / `SELF_DRIVING`
- `car_type`: `MANUAL` / `AUTOMATIC`

Google Apps Script should read this sheet and return clean JSON for the frontend.

---

## Suggested filtering behavior
The page should stay simple, but a few lightweight filters are recommended.

### Optional filters
- filter by training type:
  - all
  - DAT
  - yard practice
  - self-driving
- filter by vehicle type:
  - all
  - manual
  - automatic

### UX note
- Filters must stay simple
- They must not make the page feel crowded
- They can be placed in the top toolbar or near the week navigation area

---

## Content hierarchy rules
- Student name must be the most visually prominent information
- Training type must be the second most prominent
- Vehicle type and license plate should appear as secondary metadata
- If multiple students appear in the same session, each entry must still be easy to distinguish
- Do not render the schedule as a raw spreadsheet table for the main weekly view

---

## Responsive behavior
The page must work on:
- desktop
- tablet
- basic mobile view

### Suggested responsive behavior
- Desktop: show the full 7-day layout
- Tablet: allow a compact layout or light horizontal scrolling
- Mobile: switch to stacked day cards instead of forcing a tiny 7-column layout

---

## Performance requirements
Because the frontend runs on GitHub Pages and the backend uses Google Apps Script:

- render the weekly layout immediately, then load data
- fetch data only for the selected week
- do not fetch unnecessary weeks
- keep the JSON response compact
- do not block the UI while waiting for data

---

## Acceptance criteria

### Navigation
- The sidebar includes a **Weekly Planner** item
- Users can open the Weekly Planner page from the sidebar
- The active sidebar state is displayed correctly

### Layout
- The page displays all 7 days from Monday to Sunday
- Each day clearly shows the exact date
- Each day contains 2 sections:
  - Morning
  - Afternoon

### Data display
- Data is loaded from Google Sheets through Google Apps Script
- Each schedule entry displays:
  - student name
  - training type
  - vehicle type
  - license plate
- Empty sessions must show a clear empty state

### UX
- The interface is simple, modern, and visually appealing
- The page is not cluttered
- Information is easy to scan quickly
- A suitable loading state is provided
- Week navigation includes previous / next / current week controls

### Technical constraints
- Frontend must remain a static GitHub Pages site
- Backend logic must remain Google Apps Script
- Data source must remain Google Sheets
- No unsupported backend technologies may be introduced

---

## Out of scope
- no drag-and-drop scheduling
- no advanced calendar management system
- no complex permission system
- no realtime synchronization
- no enterprise-level scheduling features

---

## Implementation note for Codex
Design this page as a clean and modern weekly planner inside an admin dashboard, not as a spreadsheet clone. Prioritize readability, spacing, hierarchy, and fast visual scanning. Use soft card-based sections, clear morning/afternoon separation, and lightweight badges. Keep it aesthetic, simple, and operationally practical.

## Language constraint
This requirement document is written in English for implementation clarity, but the actual product UI/UX must remain in Vietnamese.

### Mandatory rules
- All visible labels, buttons, navigation items, headings, table headers, empty states, helper texts, and user-facing messages must be written in Vietnamese
- Do not rename existing or new UI features into English in the actual interface
- Keep page names in Vietnamese, including:
  - Dashboard
  - Học viên
  - Lịch tuần
- The new sidebar item must be displayed as: **Lịch tuần**
- Session labels in the UI must be displayed in Vietnamese, for example:
  - Sáng
  - Chiều
- Empty states, loading texts, filter labels, and status texts must also be shown in Vietnamese
- English may be used only inside code, variable names, internal data structures, API contracts, and technical documentation