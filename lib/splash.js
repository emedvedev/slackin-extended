import dom from 'vd'

export default function splash ({ path, name, org, coc, logo, active, total, channels, large, iframe, gcaptcha_sitekey }){
  let div = dom('.splash',
    !iframe && dom('.logos',
      logo && dom(`.logo.org style="background-image:url(${logo})"`),
      dom('.logo.slack')
    ),
    dom('p',
      'Join ', dom('b', name),
      // mention single single-channel inline
      channels && channels.length === 1 && dom('span', ' #', channels[0]),
      ' on Slack.'
    ),
    dom('p.status',
      active
        ? [
          dom('b.active', active), ' users online now of ',
          dom('b.total', total), ' registered.'
        ]
        : [dom('b.total', total), ' users are registered so far.']
    ),
    dom('form id=invite',
      channels && (
        channels.length > 1
          // channel selection when there are multiple
          ? dom('select.form-item name=channel',
              channels.map(channel => {
                return dom('option', { value: channel, text: channel })
              })
            )
          // otherwise a fixed channel
          : dom('input type=hidden name=channel', { value: channels[0] })
      ),
      dom('input.form-item type=email name=email placeholder=you@yourdomain.com '
        + (!iframe ? 'autofocus' : '')),
      dom('br'),
      dom(`div class="g-recaptcha" data-sitekey="${gcaptcha_sitekey}"`),
      coc && dom('.coc',
        dom('label',
          dom('input type=checkbox name=coc value=1'),
          'I agree to the ',
          dom('a', { href: coc, target: '_blank' }, 'Code of Conduct'),
          '.'
        )
      ),
      dom('button.loading', 'Get my Invite')
    ),
    dom('p.signin',
      'or ',
      dom(`a href=https://${org}.slack.com target=_top`, 'sign in'),
      '.'
    ),
    !iframe && dom('footer',
      'powered by ',
      dom('a href=http://rauchg.com/slackin target=_blank', 'slackin')
    ),
    // style({ logo, active, large, iframe }),
    // xxx: single build
    dom('script', `
      data = {};
      data.path = ${JSON.stringify(path)};
    `),
    dom(`link rel=stylesheet href=${path}assets/main.css`),
    dom('script src=https://cdn.socket.io/socket.io-1.4.4.js'),
    dom(`script src=${path}assets/superagent.js`),
    dom(`script src=${path}assets/client.js`)
  )
  return div
}
