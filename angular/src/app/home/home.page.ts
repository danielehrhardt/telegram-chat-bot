import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
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
  user;
  country: string;
  groupName;
  message;

  constructor(private loadingCtrl: LoadingController) {}

  async ngOnInit() {
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

  async sendMessagesToGroupUsers(message: string) {
    console.log('message', message, this.groupName);

    const users = await this.api.call('messages.getAllChats', {
      except_ids: [],
    });

    const chat = users.chats.find((_) => _.title.includes(this.groupName));
    console.log('chat', chat);
    if (chat) {
      const fullChat = await this.api.call('messages.getFullChat', {
        chat_id: chat.id,
      });

      if (fullChat) {
        await Promise.all(
          fullChat.users.map(async (_) => {
            console.log('sendMessage -> ', _, message);
            await this.api.call('messages.sendMessage', {
              clear_draft: true,
              peer: {
                _: 'inputPeerUser',
                user_id: _.id,
              },
              message: message,
              entities: [
                {
                  _: 'messageEntityBold',
                  offset: 6,
                  length: 13,
                },
              ],

              random_id:
                Math.ceil(Math.random() * 0xffffff) +
                Math.ceil(Math.random() * 0xffffff),
            });
            await this.sleep((Math.floor(Math.random() * 10) + 1) * 100);
            return _;
          })
        );
      }
    }
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
