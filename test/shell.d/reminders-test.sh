#!/bin/bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/base-test.sh"

run_node_test <<'JS'
const reminders = requireFromRoot('shell/plugins/reminders/ReminderFlowModel.js')

assertEqual(reminders.validMinutes('15'), '15', 'reminders accepts positive integer minutes')
assertEqual(reminders.validMinutes('  5  '), '5', 'reminders trims minute input')
assertEqual(reminders.validMinutes('0'), '', 'reminders rejects zero minutes')
assertEqual(reminders.validMinutes('-5'), '', 'reminders rejects negative minutes')
assertEqual(reminders.validMinutes('1.5'), '', 'reminders rejects fractional minutes')
assertEqual(reminders.validMinutes('soon'), '', 'reminders rejects non-numeric minutes')

assertDeepEqual(
  reminders.reminderArgs('10', 'Check the oven'),
  ['10', 'Check the oven'],
  'reminders builds command args with message'
)

assertDeepEqual(
  reminders.reminderArgs('10', ''),
  ['10'],
  'reminders omits empty message arg'
)

assertDeepEqual(
  reminders.reminderArgs('0', 'ignored'),
  [],
  'reminders command args are empty for invalid minutes'
)

const now = new Date(2026, 9, 12, 13, 41, 30)

assertDeepEqual(reminders.parseWhen('15'), { kind: 'duration', minutes: 15 }, 'reminders parses plain minutes')
assertDeepEqual(reminders.parseWhen('1h30m'), { kind: 'duration', minutes: 90 }, 'reminders parses hour and minute durations')
assertDeepEqual(reminders.parseWhen('in 2 hours'), { kind: 'duration', minutes: 120 }, 'reminders parses spelled-out durations')
assertDeepEqual(reminders.parseWhen('3:30 PM'), { kind: 'time', hour: 15, minute: 30, tomorrow: false }, 'reminders parses 12-hour clock times')
assertDeepEqual(reminders.parseWhen('12am'), { kind: 'time', hour: 0, minute: 0, tomorrow: false }, 'reminders parses 12am as midnight')
assertDeepEqual(reminders.parseWhen('15:30'), { kind: 'time', hour: 15, minute: 30, tomorrow: false }, 'reminders parses 24-hour clock times')
assertDeepEqual(reminders.parseWhen('tomorrow at 9am'), { kind: 'time', hour: 9, minute: 0, tomorrow: true }, 'reminders parses tomorrow times')
assertEqual(reminders.parseWhen('13pm'), null, 'reminders rejects invalid 12-hour times')
assertEqual(reminders.parseWhen('25:00'), null, 'reminders rejects invalid 24-hour times')
assertEqual(reminders.parseWhen('soon'), null, 'reminders rejects unrecognized input')

assertEqual(reminders.describe(reminders.parseWhen('1h30m'), now), 'In 1h 30m · at 3:11 PM', 'reminders previews durations')
assertEqual(reminders.describe(reminders.parseWhen('3:30pm'), now), '3:30 PM today · in 1h 49m', 'reminders previews clock times')
assertEqual(reminders.describe(reminders.parseWhen('9am'), now), '9:00 AM tomorrow · in 19h 19m', 'reminders rolls past times to tomorrow')

assertDeepEqual(reminders.scheduleArgs(reminders.parseWhen('1h'), 'Stretch', now), ['60', 'Stretch'], 'reminders schedules durations in minutes')
assertDeepEqual(reminders.scheduleArgs(reminders.parseWhen('3:30pm'), '', now), ['15:30'], 'reminders schedules clock times for today')
assertDeepEqual(reminders.scheduleArgs(reminders.parseWhen('9am'), 'Call mom', now), ['tomorrow 09:00', 'Call mom'], 'reminders schedules passed times for tomorrow')
JS
