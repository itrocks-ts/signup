import { Action }       from '@itrocks/action'
import { Request }      from '@itrocks/action-request'
import { Type }         from '@itrocks/class-type'
import { dataToObject } from '@itrocks/data-to-object'
import { hashPassword } from '@itrocks/password/transformers'
import { Headers }      from '@itrocks/request-response'
import { dataSource }   from '@itrocks/storage'
import { AttemptLimiter } from '@itrocks/user'
import { User }         from '@itrocks/user'

const signupAttempts = new AttemptLimiter({
	maxAttempts: 5,
	windowMs:    60 * 60 * 1000
})
const signupVolume = new AttemptLimiter({
	maxAttempts: 50,
	windowMs:    60 * 60 * 1000
})

function credentialsAreValid(email: string, login: string, password: string): boolean
{
	return (
		(email.length <= 254)
		&& /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
		&& /^[^\u0000-\u001f\u007f]{1,100}$/.test(login)
		&& (password.length > 0)
		&& (password.length <= 1024)
	)
}

export class Signup<T extends User = User> extends Action<T>
{

	async html(request: Request<T>)
	{
		const userType: Type<User> = request.type
		let statusCode   = 200
		let templateName = 'signup'
		const user       = new userType

		if (Object.keys(request.request.data).length) {
			const data        = request.request.data
			const email       = (typeof data.email === 'string') ? data.email.trim() : ''
			const login       = (typeof data.login === 'string') ? data.login.trim() : ''
			const password    = (typeof data.password === 'string') ? data.password : ''
			const attempt     = signupAttempts.consume((email || login).toLocaleLowerCase('en-US'))
			const total       = signupVolume.consume('all')
			if (!attempt.allowed || !total.allowed) {
				const headers: Headers = {
					'Retry-After': Math.max(attempt.retryAfterSeconds, total.retryAfterSeconds).toString()
				}
				return this.htmlTemplateResponse(user, request, __dirname + '/signup-error.html', 429, headers)
			}
			if (!credentialsAreValid(email, login, password)) {
				return this.htmlTemplateResponse(user, request, __dirname + '/signup-error.html', 422)
			}

			await dataToObject(user, { ...data, email, login, password: '' })
			user.password = await hashPassword(password)
			const dao   = dataSource()
			const found = await dao.searchOne(userType, { email })
				|| await dao.searchOne(userType, { login })
				|| await dao.searchOne(userType, { email: login })
				|| await dao.searchOne(userType, { login: email })
			if (found) {
				statusCode   = 422
				templateName = 'signup-error'
			}
			else {
				await dao.save(user)
				statusCode   = 201
				templateName = 'registered'
			}
		}

		return this.htmlTemplateResponse(user, request, __dirname + '/' + templateName + '.html', statusCode)
	}

}
