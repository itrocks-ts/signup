import { Action }       from '@itrocks/action'
import { Request }      from '@itrocks/action-request'
import { Type }         from '@itrocks/class-type'
import { dataToObject } from '@itrocks/data-to-object'
import { dataSource }   from '@itrocks/storage'
import { User }         from '@itrocks/user'

export class Signup<T extends User = User> extends Action<T>
{

	async html(request: Request<T>)
	{
		const userType: Type<User> = request.type
		let templateName = 'signup'
		let user         = new userType

		if (Object.keys(request.request.data).length) {
			await dataToObject(user, request.request.data)
			const { email, login, password } = user
			if (email.length && login.length && password.length) {
				const dao   = dataSource()
				const found = await dao.searchOne(userType, { email })
					|| await dao.searchOne(userType, { login })
					|| await dao.searchOne(userType, { email: login })
					|| await dao.searchOne(userType, { login: email })
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
