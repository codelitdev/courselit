import React from 'react'
import renderer from 'react-test-renderer'
import SessionButton from '../../components/sessionbutton.js'

test('When user is logged out', () => {
  const component = renderer.create(
    <SessionButton auth={{guest: true, token: ''}} />
  )

  let tree = component.toJSON()
  expect(tree).toMatchSnapshot()
})

test('When user is logged in', () => {
  const component = renderer.create(
    <SessionButton auth={{guest: false, token: ''}} />
  )

  let tree = component.toJSON()
  expect(tree).toMatchSnapshot()
})
