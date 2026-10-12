var MINUTES_PER_DAY = 24 * 60

function validMinutes(value) {
  var minutes = String(value || "").trim()
  return /^[0-9]+$/.test(minutes) && Number(minutes) > 0 ? minutes : ""
}

function parseDuration(text) {
  var plain = validMinutes(text)
  if (plain) return Number(plain)

  var match = /^(?:in\s+)?(?:(\d+)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?$/.exec(text)
  if (!match || (match[1] === undefined && match[2] === undefined)) return 0

  var minutes = Number(match[1] || 0) * 60 + Number(match[2] || 0)
  return minutes > 0 ? minutes : 0
}

function parseClock(text) {
  if (text === "noon") return { hour: 12, minute: 0 }
  if (text === "midnight") return { hour: 0, minute: 0 }

  var match = /^(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s*(?:m\.?)?$/.exec(text)
  if (match) {
    var hour12 = Number(match[1])
    var minute12 = Number(match[2] || 0)
    if (hour12 < 1 || hour12 > 12 || minute12 > 59) return null
    return { hour: (hour12 % 12) + (match[3] === "p" ? 12 : 0), minute: minute12 }
  }

  match = /^(\d{1,2}):(\d{2})$/.exec(text)
  if (match) {
    var hour24 = Number(match[1])
    var minute24 = Number(match[2])
    if (hour24 > 23 || minute24 > 59) return null
    return { hour: hour24, minute: minute24 }
  }

  return null
}

// Returns { kind: "duration", minutes } or { kind: "time", hour, minute, tomorrow }, or null.
function parseWhen(value) {
  var text = String(value || "").trim().toLowerCase().replace(/\s+/g, " ")
  if (!text) return null

  var minutes = parseDuration(text)
  if (minutes) return { kind: "duration", minutes: minutes }

  var tomorrow = false
  var stripped = text.replace(/^(?:tomorrow|tmrw?)\s+/, function() { tomorrow = true; return "" })
  stripped = stripped.replace(/\s+(?:tomorrow|tmrw?)$/, function() { tomorrow = true; return "" })
  stripped = stripped.replace(/^at\s+/, "")

  var clock = parseClock(stripped)
  if (!clock) return null
  return { kind: "time", hour: clock.hour, minute: clock.minute, tomorrow: tomorrow }
}

function resolveDate(when, now) {
  now = now || new Date()
  if (!when) return null

  if (when.kind === "duration") return new Date(now.getTime() + when.minutes * 60000)

  var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), when.hour, when.minute, 0, 0)
  if (when.tomorrow || target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  return target
}

function formatClock(date) {
  var hour = date.getHours() % 12 || 12
  var minute = date.getMinutes()
  return hour + ":" + (minute < 10 ? "0" : "") + minute + " " + (date.getHours() < 12 ? "AM" : "PM")
}

function formatDuration(minutes) {
  var hours = Math.floor(minutes / 60)
  var rest = minutes % 60
  if (hours && rest) return hours + "h " + rest + "m"
  if (hours) return hours + "h"
  return rest + "m"
}

function dayLabel(target, now) {
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  var days = Math.round((new Date(target.getFullYear(), target.getMonth(), target.getDate()) - today) / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  return target.toDateString()
}

function describe(when, now) {
  now = now || new Date()
  var target = resolveDate(when, now)
  if (!target) return ""

  if (when.kind === "duration")
    return "In " + formatDuration(when.minutes) + " · at " + formatClock(target)

  var minutesAway = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 60000))
  return formatClock(target) + " " + dayLabel(target, now) + " · in " + formatDuration(Math.min(minutesAway, MINUTES_PER_DAY))
}

function withMessage(args, message) {
  var text = String(message || "")
  if (text.length > 0) args.push(text)
  return args
}

function reminderArgs(minutes, message) {
  var valid = validMinutes(minutes)
  if (!valid) return []
  return withMessage([valid], message)
}

function pad(value) {
  return (value < 10 ? "0" : "") + value
}

// omarchy-reminder args for `when`: minutes for durations, "HH:MM" or
// "tomorrow HH:MM" for clock times.
function scheduleArgs(when, message, now) {
  now = now || new Date()
  if (!when) return []
  if (when.kind === "duration") return reminderArgs(when.minutes, message)

  var target = resolveDate(when, now)
  var clock = pad(target.getHours()) + ":" + pad(target.getMinutes())
  return withMessage([dayLabel(target, now) === "tomorrow" ? "tomorrow " + clock : clock], message)
}

if (typeof module !== "undefined") {
  module.exports = {
    validMinutes: validMinutes,
    reminderArgs: reminderArgs,
    parseWhen: parseWhen,
    resolveDate: resolveDate,
    describe: describe,
    scheduleArgs: scheduleArgs
  }
}
