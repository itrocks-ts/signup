import { Action }       from '@itrocks/action'
import { Request }      from '@itrocks/action-request'
import { dataToObject } from '@itrocks/data-to-object'
import { dataSource }   from '@itrocks/storage'
import { User }         from '@itrocks/user'

export class Signup extends Action
{

	async html(request: Request<User>)
	{
		let templateName = 'signup'
		let user         = new request.type

		if (Object.keys(request.request.data).length) {
			await dataToObject(user, request.request.data)
			const { email, login, password } = user
			if (email.length && login.length && password.length) {
				const dao   = dataSource()
				const found = (await dao.search(User, {email}))[0]
					|| (await dao.search(User, {login}))[0]
					|| (await dao.search(User, {email: login}))[0]
					|| (await dao.search(User, {login: email}))[0]
				if (found) {
					templateName = 'signup-error'
					user         = found
				}
				else {
					await dao.save(user)
					templateName = 'registered'
				}
			}
			else {
				templateName = 'signup-error'
			}
		}

		return this.htmlTemplateResponse(user, request, __dirname + '/' + templateName + '.html')
	}

}
