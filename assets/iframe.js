/* globals io:false, data:false */

(function () {
  // give up and resort to `target=_blank`
  // if we're not modern enough
  if (!document.body.getBoundingClientRect
   || !document.body.querySelectorAll
   || !window.postMessage) {
    return
  }

  // the id for the script we capture
  var id

  // listen on setup event from the parent
  // to set up the id
  window.addEventListener('message', function onmsg(e) {
    if (/^slackin:/.test(e.data)) {
      id = e.data.replace(/^slackin:/, '')
      document.body.addEventListener('click', function (ev) {
        var el = ev.target
        while (el && el.nodeName !== 'A') el = el.parentNode
        if (el && el.target === '_blank') {
          ev.preventDefault()
          window.parent.postMessage('slackin-click:' + id, '*')
        }
      })
      window.removeEventListener('message', onmsg)

      // notify initial width
      refresh()
    }
  })

  // notify parent about current width
  var button = document.querySelector('.slack-button')
  var lastWidth
  function refresh() {
    if (window !== window.top && window.postMessage) {
      var width = Math.ceil(button.getBoundingClientRect().width)
      if (lastWidth !== width) {
        lastWidth = width
        window.parent.postMessage('slackin-width:' + id + ':' + width, '*')
      }
    }
  }

  // initialize realtime events asynchronously
  var script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.7.4/socket.io.slim.min.js'
  script.addEventListener('load', function () {
    // use dom element for better cross browser compatibility
    var url = document.createElement('a')
    url.href = window.location
    var socket = io({ path: data.path + 'socket.io' })
    var count = document.querySelector('.slack-count')

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

    var anim
    function update(key, n) {
      if (data[key] !== n) {
        data[key] = n
        var str = ''
        if (data.active) str = data.active + '/'
        if (data.total) str += data.total
        if (!str.length) str = '–'
        if (anim) clearTimeout(anim)
        count.textContent = str
        count.classList.add('anim')
        anim = setTimeout(function () {
          count.classList.remove('anim')
        }, 200)
        refresh()
      }
    }
  })
  document.body.appendChild(script)
}())
