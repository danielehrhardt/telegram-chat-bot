import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import MTProto from '@mtproto/core/envs/browser';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  api;
  user;
  country: string;
  groupName;
  message;
  chats;
  selectedChat;
  participants;

  constructor(private loadingCtrl: LoadingController) {}

  clear() {
    localStorage.removeItem('api_id');
    localStorage.removeItem('api_hash');
  }

  async ngOnInit() {
    let api_id = localStorage.getItem('api_id');
    let api_hash = localStorage.getItem('api_hash');

    if (!api_id && !api_hash) {
      await alert(
        'Gehe auf folgende Website: https://my.telegram.org/apps erstelle eine neue App und drücke anschließend auf Ok'
      );
      api_id = await prompt('Kopiere nun die Api ID hier rein: ');
      localStorage.setItem('api_id', api_id);

      api_hash = await prompt('Kopiere nun die Api Hash hier rein: ');
      localStorage.setItem('api_hash', api_hash);
    }

    const loading = await this.loadingCtrl.create();
    loading.present();

    this.api = new MTProto({
      api_id,
      api_hash,
    });

    const result = await this.api.call('help.getNearestDc');
    this.country = result.country;

    loading.dismiss();

    await this.initUser();
  }

  async findGroup() {
    const users = await this.api.call('messages.getAllChats', {
      except_ids: [],
    });
    // console.log('users.chats', users.chats);

    const chats = users.chats.filter((_) => _.title.includes(this.groupName));
    console.log('chats', chats);
    this.chats = chats;
  }

  async getParticipants() {
    if (this.selectedChat._ == 'chat') {
      this.participants = (await this.api.call('messages.getFullChat', {
        chat_id: this.selectedChat.id,
        access_hash: this.selectedChat.access_hash,
      })).users;
    } else if (this.selectedChat._ == 'channel') {
      try {
        const fullChat = await this.api.call('channels.getFullChannel', {
            channel: {
              _: 'inputChannel',
              channel_id: this.selectedChat.id,
              access_hash: this.selectedChat.access_hash,
            }
          });
        const hash = Math.ceil(Math.random() * 0xffffff) +
          Math.ceil(Math.random() * 0xffffff);
        this.participants = [];
        try {
          for (let counter = 1; this.participants.length < counter;) {
            console.log('Search', counter, this.participants.length);
            let participants = await this.api.call('channels.getParticipants', {
              channel: {
                _: 'inputChannel',
                channel_id: this.selectedChat.id,
                access_hash: this.selectedChat.access_hash,
              },
              filter: {
                _: 'channelParticipantsSearch',
                q: '' // Suche nach ...
              },
              offset: this.participants.length,
              limit: 100,
              hash
            });
            if (counter === 1) {
              counter = participants.count;
            }
            participants.users.forEach(u => this.participants.push(u));
          }
        } catch (e) { console.log('Too many requests?', e); }
        // this.participants = (await this.api.call('channels.getFullChannel', {
        //   channel: {
        //     _: 'inputChannel',
        //     channel_id: this.selectedChat.id,
        //     access_hash: this.selectedChat.access_hash,
        //   }
        // })).users;
      } catch (error) {
        console.log('error', error);
      }
    }
  }

  async sendMessageToGroup() {
    const loading = await this.loadingCtrl.create({
      message: 'Sending messages...',
    });
    // loading.present();
    if (this.selectedChat) {
      let fullChat;
      if (this.selectedChat._ == 'chat') {
        fullChat = await this.api.call('messages.getFullChat', {
          chat_id: this.selectedChat.id,
          access_hash: this.selectedChat.access_hash,
        });
      }

      if (this.selectedChat._ == 'channel') {
        try {
          fullChat = await this.api.call('channels.getFullChannel', {
            channel: {
              _: 'inputChannel',
              channel_id: this.selectedChat.id,
              access_hash: this.selectedChat.access_hash,
            }
          });
        } catch (error) {
          console.log('error', error);
        }
      }
      console.log('fullChat', fullChat, this.selectedChat);
      return;
      if (fullChat) {
        try {
          await Promise.all(
            fullChat.users.map(async (_) => {
              console.log('sendMessage -> ', _, this.message);
              await this.api.call('messages.sendMessage', {
                clear_draft: true,
                peer: {
                  _: 'inputPeerUser',
                  user_id: _.id,
                  access_hash: _.access_hash,
                },
                message: this.message,
                random_id:
                  Math.ceil(Math.random() * 0xffffff) +
                  Math.ceil(Math.random() * 0xffffff),
              });
              await this.sleep((Math.floor(Math.random() * 10) + 1) * 100);
              return _;
            })
          );
        } catch (error) {
        } finally {
          loading.dismiss();
        }
      }
    }
    loading.dismiss();
  }

  async sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async sendMessageToUserId(userId: string, message: string) {
    await this.api.call('messages.sendMessage', {
      clear_draft: true,
      peer: {
        _: 'inputPeerUser',
        user_id: userId,
      },
      message: message,

      random_id:
        Math.ceil(Math.random() * 0xffffff) +
        Math.ceil(Math.random() * 0xffffff),
    });
  }

  async initUser() {
    const user = await this.getUser();

    // const phone = '+4915161018772';
    if (!user) {
      const phone = await prompt('Gebe deine Handynummer ein: ');
      const { phone_code_hash } = await this.sendCode(phone);
      const code = await prompt('Gebe den Code von Telegram ein: ');

      try {
        const signInResult = await this.signIn({
          code,
          phone,
          phone_code_hash,
        });
      } catch (error) {
        if (error.error_message !== 'SESSION_PASSWORD_NEEDED') {
          console.log(`error:`, error);

          return;
        }
      }
      location.reload();
    } else {
      this.user = user;
      console.log('user:', user);
    }
  }

  async getUser() {
    try {
      const user = await this.api.call('users.getFullUser', {
        id: {
          _: 'inputUserSelf',
        },
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  sendCode(phone) {
    return this.api.call('auth.sendCode', {
      phone_number: phone,
      settings: {
        _: 'codeSettings',
      },
    });
  }

  signIn({ code, phone, phone_code_hash }) {
    return this.api.call('auth.signIn', {
      phone_code: code,
      phone_number: phone,
      phone_code_hash: phone_code_hash,
    });
  }
}
