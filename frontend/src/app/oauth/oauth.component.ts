/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { ActivatedRoute, Router } from '@angular/router'
import { UserService } from '../Services/user.service'
import { CookieService } from 'ngy-cookie'
import { Component, NgZone, type OnInit, inject } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'
import { MatCardModule } from '@angular/material/card'

@Component({
  selector: 'app-oauth',
  templateUrl: './oauth.component.html',
  styleUrls: ['./oauth.component.scss'],
  imports: [MatCardModule, TranslateModule]
})
export class OAuthComponent implements OnInit {
  private readonly cookieService = inject(CookieService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);


  ngOnInit (): void {

  const params = this.parseRedirectUrlParams();
  const accessToken = params.access_token
  const returnedState = params.state
  const storedState = sessionStorage.getItem('oauth_state');

  if (accessToken && returnedState === storedState) {
    console.log("siema")
      this.userService.oauthLogin(accessToken).subscribe({
      next: (profile: any) => {
        const password = btoa(profile.email.split('').reverse().join(''))
        this.userService.save({ email: profile.email, password, passwordRepeat: password }).subscribe({
          next: () => {
            this.login(profile)
          },
          error: () => { this.login(profile) }
        })
      },
      error: (error) => {
        this.invalidateSession(error)
        this.ngZone.run(async () => await this.router.navigate(['/login']))
      }
    });
  } else {
    console.warn('OAuth login failed or state mismatch.');
  }
}


  login (profile: any) {
    this.userService.login({ email: profile.email, password: btoa(profile.email.split('').reverse().join('')), oauth: true }).subscribe({
      next: (authentication) => {
        const expires = new Date()
        expires.setHours(expires.getHours() + 8)
        this.cookieService.put('token', authentication.token, { expires })
        localStorage.setItem('token', authentication.token)
        sessionStorage.setItem('bid', authentication.bid)
        this.userService.isLoggedIn.next(true)
        this.ngZone.run(async () => await this.router.navigate(['/']))
      },
      error: (error) => {
        this.invalidateSession(error)
        this.ngZone.run(async () => await this.router.navigate(['/login']))
      }
    })
  }

  invalidateSession (error: Error) {
    console.log(error)
    this.cookieService.remove('token')
    localStorage.removeItem('token')
    sessionStorage.removeItem('bid')
  }

  parseRedirectUrlParams () {
    const hash = this.route.snapshot.data.params.substr(1)
    const splitted = hash.split('&')
    const params: any = {}
    for (const part of splitted) {
      const [key, value] = part.split('=')
      params[key] = value
    }
    return params
  }
}
