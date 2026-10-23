# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A small friend/group cohort recording who attended recurring hangouts.

## Product Purpose

Let the group quickly record attendance for a date, review participation across the calendar, and preserve notes/photos from each hangout.

## Positioning

The product combines a shared attendance record with a date-based visual memory of the group's hangouts, using each member's emoji identity and optional photos.

## Operating Context

Members open the calendar around or after a hangout, select a date, mark who attended, optionally add a short description and photo, and later browse the month to recall events and participation.

## Capabilities and Constraints

- Calendar navigation by month.
- Create, update, and delete hangout records.
- Record attendance for the configured member roster.
- Add a note and optional photo to a hangout.
- Show attendance counts, member emoji stamps, and photo-backed calendar dates.
- Display aggregate participation statistics.
- Web app deployed on Vercel.
- Supabase provides the database and photo storage.
- Attendance data is intended to remain private to the group.

## Brand Commitments

- Existing product name: "ĐIỂM DANH MAI CONFESSION".
- Preserve the existing Vietnamese group voice.
- Preserve emoji-based member identity.
- Existing floral, playful personality is part of the product's identity.

## Evidence on Hand

- React/Vite source in `src/`.
- Vercel serverless API routes in `api/`.
- Supabase schema and migrations in `supabase/`.
- Existing member roster and emoji/color assignments in the backend seed/schema.
- Existing visual assets in `src/assets/` and `public/`.

## Product Principles

- Recording attendance should be quick and low-friction.
- The calendar should make participation and memories easy to scan.
- Member identity should remain recognizable through names and emojis.
- Notes and photos should enrich the record without obscuring the attendance task.
- Errors should be visible and actionable rather than silently ignored.

## Accessibility & Inclusion

The interface should remain usable on mobile and desktop, preserve readable contrast over uploaded-photo backgrounds, and not rely on emoji or color alone to communicate attendance.
