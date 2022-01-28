import { Component, OnInit } from '@angular/core';
import MTProto from '@mtproto/core/envs/browser';

const api_id = '10370817';
const api_hash = '6f541bce03b3699c9eade214311b475b';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  api;
  country: string;
  constructor() {}

  async ngOnInit() {
    this.api = new MTProto({
      api_id,
      api_hash,
    });

    const result = await this.api.call('help.getNearestDc');
    this.country = result.country;
  }
}
