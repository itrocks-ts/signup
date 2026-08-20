const assert                      = require('node:assert/strict')
const { basename }                = require('node:path')
const { before }                  = require('node:test')
const { describe, it }            = require('node:test')
require('@itrocks/class-file/automation')
const { passwordDependsOn }       = require('@itrocks/password')
const { setPasswordTransformers } = require('@itrocks/password/transformers')
const { verifyPassword }          = require('@itrocks/password/transformers')
const { createDataSource }        = require('@itrocks/storage')

passwordDependsOn({ setTransformers: setPasswordTransformers })

const { Signup } = require('../cjs/signup')
const { User }   = require('@itrocks/user')

const users = []

function signup()
{
	const action = new Signup()
	action.htmlTemplateResponse = async (_data, _request, template, statusCode = 200, headers = {}) => ({
		body: basename(template),
		headers,
		statusCode
	})
	return action
}

function signupRequest(data)
{
	return {
		request: { data },
		type:    User
	}
}

before(() => {
	createDataSource({ engine: require.resolve('./memory-data-source'), users })
})

describe('Signup', () => {
	it('creates a minimal private user with a derived password', async () => {
		const response = await signup().html(signupRequest({
			age:      '42',
			email:    ' alice@example.test ',
			login:    ' alice ',
			password: 'private password'
		}))

		assert.deepEqual(response, { body: 'registered.html', headers: {}, statusCode: 201 })
		assert.equal(users.length, 1)
		assert.equal(users[0].age, undefined)
		assert.equal(users[0].email, 'alice@example.test')
		assert.equal(users[0].login, 'alice')
		assert.match(users[0].password, /^scrypt\$32768\$8\$1\$/)
		assert.equal(await verifyPassword('private password', users[0].password), true)
	})

	it('does not distinguish an invalid form from an existing account', async () => {
		const invalid = await signup().html(signupRequest({ email: 'invalid', login: '', password: '' }))
		const existing = await signup().html(signupRequest({
			email:    'alice@example.test',
			login:    'alice',
			password: 'another password'
		}))

		assert.deepEqual(invalid, existing)
		assert.deepEqual(existing, { body: 'signup-error.html', headers: {}, statusCode: 422 })
		assert.equal(users.length, 1)
	})
})
