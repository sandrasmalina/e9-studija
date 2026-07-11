# E9 Studija Email Notification & Course Email Sender Specification

## Goal

Build a custom email notification and course email sender system for e9studija.lv using Resend.

The system must support:

1. Automatic transactional emails.
2. Course purchase confirmation emails.
3. Account creation emails.
4. Support/ticket submission emails.
5. Course-related reminder emails.
6. Instructor-editable email templates.
7. Scheduled emails before and after classes.
8. Links, instructions, Zoom/class details, and recording links inside emails.

---

# 1. Main Email Types

## A. Account Emails

Triggered when user creates account.

Emails:

* Welcome email
* Email verification email, if used
* Password reset email, if used

Example:

“Welcome to E9 Studija. Your account has been created.”

---

## B. Course Purchase Emails

Triggered when student successfully buys a course.

Emails:

* Purchase confirmation
* Thank you for buying
* Course access instructions
* Invoice/payment confirmation, if available
* Next steps before the course starts

This email should have a default template, but instructor/admin can edit it per course.

---

## C. Ticket Emails

Triggered when user submits a support ticket/contact form.

Emails:

* Confirmation to user: “We received your message”
* Notification to admin/instructor
* Optional reply/update notification

---

## D. Course Reminder Emails

Sent based on course/class schedule.

Examples:

* 7 days before class
* 1 day before class
* 1 hour before class
* After class: “Thank you for attending”
* After class: “Recording is available”

Each reminder should be editable per course or per class.

---

# 2. Email Template System

Create an admin area where emails can be managed.

## Template Fields

Each email template should include:

* Template name
* Email type
* Course relation, optional
* Class/session relation, optional
* Subject
* Preheader text
* Email body
* Active/inactive status
* Sender name
* Reply-to email
* Send timing
* Created by
* Updated by
* Last updated date

## Template Types

Required template categories:

* Account created
* Course purchased
* Ticket submitted
* Course reminder
* Class reminder
* Recording available
* General course announcement

---

# 3. Instructor Email Editor

Instructors/teachers should be able to edit emails connected to their own courses.

## Required features

Instructor can:

* Edit subject
* Edit email body
* Add links
* Add Zoom/class link
* Add preparation instructions
* Add homework
* Add recording link
* Add date-based reminders
* Preview email
* Send test email to themselves
* Activate/deactivate email

Instructor should not edit global system templates unless they have admin role.

---

# 4. Dynamic Variables

Email templates must support variables.

Examples:

```text
{{student_name}}
{{course_title}}
{{class_title}}
{{class_date}}
{{class_time}}
{{zoom_link}}
{{course_access_link}}
{{recording_link}}
{{teacher_name}}
{{teacher_email}}
{{support_email}}
{{login_link}}
```

Example email body:

```text
Hello {{student_name}},

Thank you for buying {{course_title}}.

Your class starts on {{class_date}} at {{class_time}}.

Join here:
{{zoom_link}}

Best regards,
{{teacher_name}}
```

If a variable is missing, system should either:

* Show warning before saving template, or
* Replace missing value with empty space safely.

---

# 5. Course Email Schedule

Each course should have an “Email Schedule” section.

## Admin/instructor can create scheduled emails:

Fields:

* Email name
* Related course
* Related class/session
* Trigger type
* Send date/time
* Send offset
* Email template
* Active/inactive
* Send only to enrolled students
* Send only to paid students
* Send to all course participants

## Trigger options:

* Immediately after purchase
* Fixed date and time
* X days before class
* X hours before class
* X days after class
* When recording is published
* Manual send

Examples:

* Send 1 day before class at 10:00
* Send 1 hour before class
* Send after recording link is added
* Send immediately after purchase

---

# 6. Course/Class Data Needed

Each course should store:

* Course title
* Course description
* Teacher/instructor
* Start date
* End date
* Student list
* Course access link
* Payment status
* Course language

Each class/session should store:

* Class title
* Class date
* Start time
* End time
* Zoom/live link
* Location, if offline
* Instructions
* Homework
* Recording link
* Materials link

---

# 7. Sending Logic

## Resend Integration

Use Resend API for sending transactional emails.

Required:

* Store Resend API key securely in environment variables
* Use verified sending domain
* Use sender address like:

```text
E9 Studija <noreply@inbound.e9studija.lv>
```

or course-specific:

```text
Sandra from E9 Studija <noreply@inbound.e9studija.lv>
```

Do not allow unverified instructor emails as direct sender addresses. Use instructor email as reply-to instead.

---

# 8. Email Queue

Create email queue table.

Each email should have status:

* pending
* scheduled
* sent
* failed
* cancelled

Queue fields:

* recipient email
* recipient name
* template id
* course id
* class id
* scheduled send time
* actual sent time
* status
* error message
* Resend email id
* created date

System should retry failed emails.

Recommended retries:

* Retry after 5 minutes
* Retry after 30 minutes
* Retry after 2 hours
* Stop after 3 failed attempts

---

# 9. Admin Screens

## A. Email Templates Page

Admin can:

* View all templates
* Filter by type
* Create template
* Edit template
* Preview template
* Send test email
* Duplicate template
* Activate/deactivate template

## B. Course Email Settings

Inside each course admin page:

* Purchase email
* Reminder emails
* Recording email
* Custom announcements
* Email schedule overview

## C. Email Log

Admin can see:

* Sent emails
* Failed emails
* Scheduled emails
* Recipient
* Course
* Template used
* Send time
* Error details

## D. Manual Email Sender

Admin/instructor can send email manually to:

* One student
* All students in course
* Paid students only
* Selected students

---

# 10. Permissions

## Admin

Can:

* Manage all templates
* Manage all course emails
* See all email logs
* Send emails to all users

## Instructor

Can:

* Manage emails for own courses
* Send emails to own students
* Edit course-specific templates
* View email logs for own courses only

## Student

Can:

* Receive emails
* Manage unsubscribe preferences for marketing emails

---

# 11. Transactional vs Marketing Emails

System must separate transactional and marketing emails.

## Transactional emails

These are necessary service emails:

* Account creation
* Password reset
* Purchase confirmation
* Course access
* Class reminders
* Ticket confirmation

These should always be sent.

## Marketing emails

Examples:

* Promotions
* New course announcements
* Sales campaigns

These require unsubscribe option and user consent.

---

# 12. Important Technical Requirements

* Use Resend API for sending.
* Store API key in environment variables.
* Use Supabase database tables for templates, email queue, logs, and schedules.
* Use cron job or scheduled function to process email queue.
* Validate email addresses before sending.
* Protect against duplicate emails.
* Show error messages in admin if email fails.
* Allow sending test email before activation.
* Use responsive email layout.
* Emails must look good on mobile.
* Support Latvian and English email templates.
* Support plain text fallback if possible.

---

# 13. Suggested Database Tables

## email_templates

* id
* name
* type
* subject
* preheader
* body_html
* body_text
* language
* sender_name
* reply_to_email
* course_id
* class_id
* is_active
* created_by
* updated_by
* created_at
* updated_at

## email_schedules

* id
* template_id
* course_id
* class_id
* trigger_type
* send_at
* offset_amount
* offset_unit
* offset_direction
* is_active
* created_at
* updated_at

## email_queue

* id
* template_id
* recipient_email
* recipient_name
* user_id
* course_id
* class_id
* scheduled_for
* sent_at
* status
* resend_email_id
* error_message
* retry_count
* created_at
* updated_at

## email_logs

* id
* queue_id
* recipient_email
* subject
* status
* resend_email_id
* error_message
* sent_at
* created_at

---

# 14. Minimum Version for First Release

Build first:

1. Resend integration.
2. Account creation email.
3. Course purchase confirmation email.
4. Course reminder email 1 day before class.
5. Course reminder email 1 hour before class.
6. Recording available email.
7. Admin template editor.
8. Email log page.
9. Send test email button.
10. Manual send to course students.

Later add:

* Advanced automation
* Marketing campaigns
* Segmentation
* Drag-and-drop email builder
* Analytics: open/click tracking
* Student unsubscribe preferences
