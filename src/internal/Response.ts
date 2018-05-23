import { Headers } from './Headers'
import { Body } from './Body'

var redirectStatuses = [301, 302, 303, 307, 308]

class Response extends Body {

constructor(bodyInit, options) {
  super()
  if (!options) {
    options = {}
  }

  this.type = 'default'
  this.status = options.status === undefined ? 200 : options.status
  this.ok = this.status >= 200 && this.status < 300
  this.statusText = 'statusText' in options ? options.statusText : 'OK'
  this.headers = new Headers(options.headers)
  this.url = options.url || ''
  this._initBody(bodyInit)
}

clone() {
  return new Response(this._bodyInit, {
    status: this.status,
    statusText: this.statusText,
    headers: new Headers(this.headers),
    url: this.url
  })
}

static error() {
  var response = new Response(null, { status: 0, statusText: '' })
  response.type = 'error'
  return response
}

static redirect(url, status) {
  if (redirectStatuses.indexOf(status) === -1) {
    throw new RangeError('Invalid status code')
  }

  return new Response(null, { status: status, headers: { location: url } })
}

}

export { Response }
