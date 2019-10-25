/* globals data:false, grecaptcha:false, io:false, superagent:false */

var body = document.body
var request = superagent

// elements
var form = body.querySelector('form#invite')
var channel = form.elements.channel || {}
var email = form.elements.email
var coc = form.elements.coc
var button = body.querySelector('button')

// remove loading state
button.classList.remove('loading')

// capture submit
function submitForm(ev) {
  if (ev) ev.preventDefault()
  button.disabled = true
  button.classList.remove('loading')
  button.classList.remove('error')
  button.classList.remove('success')
  button.textContent = 'Please Wait'
  var gcaptcha_response = form.elements['g-recaptcha-response']
  var gcaptcha_token = gcaptcha_response ? gcaptcha_response.value : ''

  if (!gcaptcha_token && document.getElementById('h-captcha')) {
    return grecaptcha.execute()
  }

  invite(channel ? channel.value : null, coc && coc.checked ? 1 : 0, email.value, gcaptcha_token, function (err, msg) {
    if (err) {
      button.removeAttribute('disabled')
      button.classList.add('error')
      button.textContent = err.message
    } else {
      button.classList.add('success')
      button.textContent = msg
    }
  })
}

body.addEventListener('submit', submitForm)

function invite(chan, coc, email, gcaptcha_response_value, fn) {
  request
    .post(data.path + 'invite')
    .send({
      'g-recaptcha-response': gcaptcha_response_value,
      coc: coc,
      channel: chan,
      email: email
    })
    .end(function (res) {
      if (res && res.response) {
        res = res.response
      }

      if (res && res.body && res.body.redirectUrl) {
        window.setTimeout(function () {
          topLevelRedirect(res.body.redirectUrl)
        }, 1500)
      }

      if (res && res.error) {
        return fn(new Error(res.body.msg || 'Server error'))
      }

      fn(null, 'Invite sent')
    })
}

// use dom element for better cross browser compatibility
var url = document.createElement('a')
url.href = window.location
// realtime updates
var socket = io({ path: data.path + 'socket.io' })
socket.on('data', function (users) {
  for (var i in users) {
    if (Object.prototype.hasOwnProperty.call(users, i)) {
      update(i, users[i])
    }
  }
})
socket.on('total', function (n) {
  update('total', n)
})
socket.on('active', function (n) {
  update('active', n)
})

function update(val, n) {
  var el = document.querySelector('.' + val)
  if (el && el.textContent !== n) {
    el.textContent = n
    anim(el)
  }
}

function anim(el) {
  if (el.anim) return
  el.classList.add('grow')
  el.anim = setTimeout(function () {
    el.classList.remove('grow')
    el.anim = null
  }, 150)
}

// redirect, using "RPC" to parent if necessary
function topLevelRedirect(url) {
  if (window === window.top) window.location.href = url
  else window.parent.postMessage('slackin-redirect:' + id + ':' + url, '*')
  // Q: Why can't we just `top.location.href = url;`?
  // A:
  // [sandboxing]: http://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/
  // [CSP]: http://www.html5rocks.com/en/tutorials/security/content-security-policy/
  // [nope]: http://output.jsbin.com/popawuk/16
}

// "RPC" channel to parent
var id
window.addEventListener('message', function onmsg(e) {
  if (/^slackin:/.test(e.data)) {
    id = e.data.replace(/^slackin:/, '')
    window.removeEventListener('message', onmsg)
  }
})

body.addEventListener('load', function () {
  if (window.location.hash) {
    body.querySelector('select[name=channel]').value = window.location.hash.slice(1)
  }
})
