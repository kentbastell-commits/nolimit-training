# Feishu Base Reference

Last updated from `NL Training (1).xlsx` on 2026-06-11.

This file tracks the current Feishu table names and human-readable column labels used by the app. It intentionally stores headers only, not sample client rows.

## Clients

Client ID | Full Name | Full Name CN | Coach Assigned | Program ID | Start Date | Package Type | Email | Phone/WeChat | Notes | Last Check-in Date | Assigned Workouts | Check-ins | Progress Metrics | Workout Logs1 | Check-in | Exercise Results | Language Preference | Client Type | Primary Coach | Secondary Coach | Package | Subscription Status | Intake Status | Payment Status | Purchased Program ID | Access Start Date | Access End Date | Source | Stripe Payment ID | Notes EN | Product Orders

## Programs

Program ID | Program Name | Program Name CN | Goal | Goal CN | Sport | Level | Duration Weeks | Phase | Phase CN | Sessions / Week | Coach | Description | Description CN | Status | UnknownName | UnknownName_1 | UnknownName_2 | UnknownName_3 | UnknownName_4 | UnknownName_5 | UnknownName_6 | UnknownName_7 | UnknownName_8 | SourceID | Clients | Assigned Workouts | Workout Templates | Product Type | Price | Public Store Visible | Currency | Purchase Link | Default Intake Form ID | Duration/Weeks | Access Length Days | Product Status | Sales Description | Sales Description CN | Product Orders

## Exercise Library

Exercise ID | Exercise Name | Exercise Name CN | Category | Category CN | Technical Cues | Technical Cues Cn | Primary Muscles | Primary Muscles CN | Equipment | Difficulty | Training Quality | Default Sets | Default Reps | Default Rest | RPE Target | Professional Coaching Cues | Professional Coaching Cues CN | Common Errors / Watchouts | Common Errors / Watchouts CN | Thumbnail Image | Video URL | Photo Search Keywords | Thumbnail Search Keywords | Status | UnknownName | UnknownName_1 | SourceID | Workout Templates | Workout Logs | Exercise Results

## Workout Templates

Template ID | Program ID | Week | Day | Session Name | Session Name CN | Exercise ID | Exercise Name | Order | Sets | Reps | Video URL | Tempo | Rest | Coaching Notes | Coaching Notes CN | Status | UnknownName | UnknownName_1 | UnknownName_2 | UnknownName_3 | UnknownName_4 | UnknownName_5 | SourceID

## Assigned Workouts

Assigned Workout ID | Client ID | Program ID | Week | Day | Session Name | Session Name CN | Scheduled Date | Completion Status | Coach Notes | Coach Notes CN | Client Notes | Client Notes CN | SourceID | Workout Logs1

## Workout Logs

Log ID | Client ID | Assigned Workout ID | Exercise ID | Exercise Name | Date | Set Number | Prescribed Sets | Prescribed Reps | Actual Reps | Actual Weight | Weight Unit | Actual Time | Time Unit | Actual Distance | Distance Unit | Completed | Athlete Notes | Athlete Notes EN | Exercise Order | Created At | SourceID | Volume | Duration Seconds | Load Score

## Saved Programs

Program ID | Program Name | Goal | Sport | Duration Weeks | Phase | Sessions/week | Coach

## Progress Metrics

Progress ID | Client ID | s | Date | Body Weight | Body Fat % | Waist | Pull-Up Max | Finger Strength L | Finger Strength R | Vertical Jump | 10m Sprint | Progress Photo Front | Progress Photo Side | Progress Photo Back | Notes | UnknownName | UnknownName_1 | UnknownName_2 | UnknownName_3 | UnknownName_4 | SourceID

## Check-ins

Check-in ID | Client ID | Date | Sleep Quality 1-10 | Energy 1-10 | Stress 1-10 | Soreness 1-10 | Motivation 1-10 | Body Weight | Pain Area | Readiness Score | Client Notes | Coach Notes | UnknownName | UnknownName_1 | UnknownName_2 | UnknownName_3 | SourceID

## Payments

Payment ID | Client ID | Package | Amount | Currency | Payment Method | Paid Date | Renewal Date | Status | Invoice / Receipt URL | Notes | UnknownName | UnknownName_1 | UnknownName_2 | UnknownName_3 | UnknownName_4 | UnknownName_5 | UnknownName_6 | UnknownName_7 | UnknownName_8 | SourceID

## Onboarding Workflow

Task ID | Client ID | Stage | Task | Owner | Due Date | Status | Automation Trigger | Notes | UnknownName | UnknownName_1 | UnknownName_2 | UnknownName_3 | UnknownName_4 | UnknownName_5 | UnknownName_6 | UnknownName_7 | UnknownName_8 | UnknownName_9 | UnknownName_10 | SourceID

## Automations

Automation ID | Name | Trigger Table | Trigger Condition | Action | Recipient | Message Template | Status | UnknownName | UnknownName_1 | UnknownName_2 | UnknownName_3 | UnknownName_4 | UnknownName_5 | UnknownName_6 | UnknownName_7 | UnknownName_8 | UnknownName_9 | UnknownName_10 | UnknownName_11 | SourceID

## Check-in

Check-in ID | Client ID | Client | Submitted Date | Body Weight | Sleep Quality | Energy | Mood | Stress | Soreness | Client Notes | Coaches Notes | Reviewed Date

## Exercise Results

Result ID | Client ID | Excercise ID | Exercise Name | Date | Best Weight | Best Reps | Estimated 1 RM | Volume | Source Workout ID

## Form Templates

Form ID | Name | Name CN | Type | Description | Description CN | Product Type | Public Intake Link | Requires Coach Review

## Form Questions

Question ID | Form ID | Order | Label | Label CN | Question Type | Options | Required | Help text | Help Text CN

## Assigned Forms

Assigned Forms ID | Form ID | Client ID | Client Code | Assigned Date | Status | Completed At | Product Type | Intake Assessment | Review Status | Reviewed By | Reviewed At

## Form Responses

Response ID | Assigned Forms ID | Form ID | Client ID | Submitted At | Answers Json | Client Comment | Client Comment EN

## Test Templates

Test Template ID | Name | Name CN | Description | Description CN | Category

Category holds a stable English value from TEST_CATEGORIES in src/testVisuals.ts
(Strength, Power, Speed & Agility, Energy Systems, Mobility & Flexibility,
Balance & Stability, Skill & Technique, Body Composition, Other) — displayed
localized, never persisted translated.

## Test Items

Test Item ID | Test Template ID | Order | Test Name | Test Name CN | Metric Type | Unit | Unit CN | Instructions | Instructions CN

## Assigned Tests

Assigned Test ID | Test Template ID | Client ID | Client Code | Assigned Date | Options | Completd At

## Test Results

Result ID | Assigned Test ID | Test Template ID | Test Item ID | Client ID | Value | Unit | Notes | Notes EN | Submitted At

## Coaches

Coach ID | Name | Email | Phone/Wechat | Role | Status | Bio | Created At | Clients | Clients 2 | Assigned Forms | Product Orders

## Product Orders

Order ID | Client ID | Client Name | Product Type | Program ID | Product Name | Amount | Currency | Payment Status | Payment Provider | Payment Reference | Purchased At | Access Start Date | Intake Status | Assign Coach
