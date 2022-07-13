/**
Copyright 2022 Ryusei Yamaguchi

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const fs = require("fs")

function parseTghb(规范字笔画) {
  const variantsraw = fs.readFileSync("tghb.raw.txt", "utf-8")

  const 规范字 = new Map()
  const 註解 = new Map()

  const classMap = {
    "一级字表": 1,
    "二级字表": 2,
    "三级字表": 3,
  }

  let table = null

  for (let span of variantsraw.split(/[\t\n]+/g)) {
    span = span.trim()
    if (span.startsWith("註解")) {
      const m = span.match(/註解([a-c]\d+): (.*)/)
      註解.set(m[1], m[2])
    } else if (span.endsWith("级字表")) {
      table = span
    } else if (/^\d{4} /.test(span)) {
      const re = /^(\d{4}) (.)([a-c]\d+)?/u
      const m = re.exec(span)
      const key = m[1]
      const char = m[2]
      const note = m[3] ?? null
      规范字.set(key, [key, char, classMap[table], 规范字笔画.get(key), note])
    }
  }

  for (const v of 规范字.values()) {
    if (v[4]) v[4] = 註解.get(v[4])
  }

  console.log(规范字)
  return {
    规范字,
  }
}

function parseStrokes() {
  const variantsraw = fs.readFileSync("strokes.raw.txt", "utf-8")

  const 规范字笔画 = new Map()

  const digitMap = {
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
  }

  const digitPattern = `[${Object.keys(digitMap).join("")}]`
  const numPattern = `(${digitPattern}?十)?(${digitPattern})?`
  const re = new RegExp(`^${numPattern}画$`)

  let count = null
  for (let span of variantsraw.split(/[\t\n]+/g)) {
    span = span.trim()
    const m = re.exec(span)
    let n = 0
    if (m) {
      if (m[1]) {
        if (m[1] === "十") {
          n += 10
        } else {
          n += 10 * digitMap[m[1][0]]
        }
      }
      if (m[2]) {
        n += digitMap[m[2]]
      }
      count = n
      console.log(span, count)
    } else if (/^\d{4} /.test(span)) {
      const re = /^(\d{4}) (.)/u
      const m = re.exec(span)
      const key = m[1]
      // const char = m[2]
      规范字笔画.set(key, count)
    }
  }

  console.log(规范字笔画)
  return {
    规范字笔画,
  }
}

function parseVariants() {
  const variantsraw = fs.readFileSync("variants.raw.txt", "utf-8")

  const 规范字 = new Map()
  const 异体字 = new Map()
  const 註解 = new Map()

  const getArray = (map, key) => {
    const a = map.get(key)
    if (a == null) {
      const a = []
      map.set(key, a)
      return a
    }
    return a
  }

  let key = null
  let hant = null
  for (const span of variantsraw.split(/[\t\n]+/g)) {
    if (span.startsWith("註解")) {
      const m = span.match(/註解(\d+): (.*)/)
      註解.set(Number.parseInt(m[1]), m[2])
    } else if (/^\d+$/.test(span)) {
      key = span
      hant = null
    } else if (span === "～") {
      const char = 规范字.get(key)
      hant = char
      getArray(异体字, key).push([key, char, hant, hant, null])
    } else if (span.startsWith("(")) {
      const a = getArray(异体字, key)
      const re = /([⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻]..|[⿲⿳]...|[^\d\(\)\[\]])(\d+)?/gu
      let m
      while (m = re.exec(span)) {
        const char = m[1]
        hant = char
        const note = m[2] ? Number.parseInt(m[2]) : null
        a.push([key, 规范字.get(key), hant, hant, note])
      }
    } else if (span.startsWith("[")) {
      const a = getArray(异体字, key)
      const re = /([⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻]..|[⿲⿳]...|[^\d\(\)\[\]])(\d+)?/gu
      let m
      while (m = re.exec(span)) {
        const char = m[1]
        const note = m[2] ? Number.parseInt(m[2]) : null
        const guifan = 规范字.get(key)
        a.push([key, guifan, hant ?? guifan, char, note])
      }
    } else {
      规范字.set(key, span)
    }
  }

  for (const a of 异体字.values()) {
    for (const v of a) {
      if (v[4]) v[4] = 註解.get(v[4])
    }
  }

  console.log(异体字)
  return {
    异体字,
  }
}

const { 规范字笔画 } = parseStrokes()
const { 规范字 } = parseTghb(规范字笔画)
const {
  异体字,
} = parseVariants()

function writeTghb(规范字) {
  let s = "序号\t规范字\t级\t笔画\t註解\n"
  for (const r of 规范字.values()) {
    s += r.join("\t") + "\n"
  }
  fs.writeFileSync("tghb.txt", s, "utf-8")
}

function writeVariants(异体字) {
  let s = "序号\t规范字\t繁体字\t异体字\t註解\n"
  for (const rs of 异体字.values()) {
    for (const r of rs) {
      s += r.join("\t") + "\n"
    }
  }
  fs.writeFileSync("variants.txt", s, "utf-8")
}

writeTghb(规范字)
writeVariants(异体字)
