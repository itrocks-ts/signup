[![npm version](https://img.shields.io/npm/v/@itrocks/signup?logo=npm)](https://www.npmjs.org/package/@itrocks/signup)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/signup)](https://www.npmjs.org/package/@itrocks/signup)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/signup?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/signup)
[![issues](https://img.shields.io/github/issues/itrocks-ts/signup)](https://github.com/itrocks-ts/signup/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# signup

Handles user sign-up for @itrocks/user, with account creation and secure onboarding flow.

*This documentation was written by an artificial intelligence and may contain errors or approximations.
It has not yet been fully reviewed by a human. If anything seems unclear or incomplete,
please feel free to contact the author of this package.*

## Installation

```bash
npm i @itrocks/signup
```

`@itrocks/signup` is designed to plug into the it.rocks action and routing
stack. It is usually installed alongside `@itrocks/user`, `@itrocks/action`,
and the rest of the it.rocks back‑end packages, but you can also use it in a
custom Node.js / TypeScript application that already relies on it.rocks
infrastructure.

## Usage

`@itrocks/signup` provides a specialised `Signup` action that implements a
complete HTML sign‑up flow for your `User` entity:

- renders a sign‑up form when accessed with no POST data,
- validates the submitted fields (`email`, `login`, `password`),
- checks that the email or login is not already used by another user,
- creates and persists the new user when everything is valid,
- displays either a success page or an error page when something is wrong.

The action is tied to the `/user/signup` route through the provided
`config.yaml` file, so once the package is loaded by the it.rocks framework
you automatically get a working sign‑up endpoint.

### Minimal example

In a typical it.rocks project you do not instantiate `Signup` yourself: the
framework wires it based on configuration. The following example shows how you
would use it manually in a custom setup to better understand the API.

```ts
import { Signup }          from '@itrocks/signup'
import { toActionRequest } from '@itrocks/action-request'
import type { Request }    from '@itrocks/action-request'
import type { User }       from '@itrocks/user'

// Create an action instance bound to your User type
const signup = new Signup<User>()

// Example HTML endpoint in an HTTP framework such as Fastify
async function signupHtml (req: any, reply: any) {
  const request: Request<User> = toActionRequest<User>(req)
  const response              = await signup.html(request)

  reply
    .status(response.status)
    .headers(response.headers)
    .type('text/html')
    .send(response.body)
}
```

The action takes care of:

- creating a new `User` instance,
- binding request data to the instance,
- querying your configured data source to detect duplicates,
- saving the user when the credentials are unique,
- choosing the right template (`signup.html`, `signup-error.html`,
  `registered.html`).

### Complete example with routing and configuration

When used inside a full it.rocks stack, you usually rely on routing and
configuration instead of wiring everything manually.

1. Install the package and ensure your application loads
   `node_modules/@itrocks/signup/config.yaml` together with other
   configuration files.
2. Configure your `User` class in `@itrocks/user` (email, login, password
   fields, storage, etc.).
3. Start your HTTP server with the it.rocks router enabled.
4. Visit `/user/signup` in a browser.

Behaviour:

- On first GET, the action returns the `signup` HTML form.
- On POST with empty or incomplete credentials, it re‑displays the form
  through the `signup-error` template.
- On POST with credentials that conflict with an existing user (same email or
  login, or email/login swapped), it also displays the `signup-error` template
  and exposes the found user instance to the view layer.
- On POST with valid and unique credentials, it saves the new user and
  renders the `registered` confirmation page.

Your front‑end templates (`signup.html`, `signup-error.html`,
`registered.html`) are shipped with the package and can be customised at the
project level if needed, following the standard it.rocks theming rules.

## API

### `class Signup<T extends User = User> extends Action<T>`

Specialised action that handles the whole sign‑up lifecycle for a `User`
entity: presenting the form, validating input, checking duplicates and
persisting the user.

The class is generic so you can pass a custom user subclass if your project
extends `@itrocks/user` with additional fields.

#### Type parameter

- `T extends User = User` – the concrete user entity type handled by the
  action. By default it is the base `User` class from `@itrocks/user`, but you
  can pass any subclass that adds extra profile / domain‑specific fields.

#### Methods

##### `html(request: Request<T>): Promise<HtmlResponse>`

Builds an HTML response for the sign‑up flow.

Pipeline:

1. Creates a new user instance of `request.type`.
2. If the request contains form data, copies it onto the user using
   `@itrocks/data-to-object`.
3. Validates that `email`, `login` and `password` are non‑empty.
4. Uses the configured data source (`@itrocks/storage`) to search for an
   existing user with:
   - same email,
   - same login,
   - email used as login,
   - login used as email.
5. Depending on the outcome:
   - if a duplicate is found, renders the `signup-error` template and exposes
     the found user;
   - if everything is valid and unique, saves the new user and renders the
     `registered` template;
   - otherwise, renders the `signup-error` template for missing fields.
6. Returns an `HtmlResponse` built with `htmlTemplateResponse`, pointing to
   the selected HTML template.

Parameters:

- `request: Request<T>` – it.rocks action request describing the current HTTP
  call (method, path, data, user type, etc.). Usually created from an
  incoming HTTP request by `@itrocks/action-request`.

Return value:

- `Promise<HtmlResponse>` – response object from
  `@itrocks/core-responses` containing status, headers and rendered HTML
  body.

## Typical use cases

- **Public sign‑up page for web applications** – expose `/user/signup` so
  visitors can create their own account that is stored through
  `@itrocks/user` and `@itrocks/storage`.
- **Onboarding flow in a portal** – integrate the sign‑up form into a wider
  onboarding sequence (email verification, profile completion, terms
  acceptance) while keeping user creation logic in a single action.
- **Reuse in multiple projects** – share the same sign‑up logic across
  several back‑end services or customer‑facing applications by plugging the
  `Signup` action into each project configuration.
- **Custom user models** – derive your own `Customer` or `Member` class from
  `User` and use `Signup<Customer>` so that additional fields (company,
  locale, marketing preferences, …) are captured at registration time.
