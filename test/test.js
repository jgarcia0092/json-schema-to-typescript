import test from 'ava'
import {compile} from '../'
import {equal} from 'assert'
import {readFileSync} from 'fs'
import {diff} from './helpers'
import glob from 'glob-promise'

glob('cases/*.js').then(cases =>
  cases.forEach(caseName =>
    test(caseName, async t => {
      const c = require(`./${caseName}`)
      const a = await compile(JSON.parse(c.in))
      const b = c.out
      if (a !== b) diff(a, b)
      t.is(a, b)
    })
  )
)