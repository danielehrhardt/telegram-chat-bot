import { Component, OnInit, ViewChild } from '@angular/core';
import {
  IonContent,
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular';
import MTProto from '@mtproto/core/envs/browser';
import { DataService } from '../data.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild(IonContent) content: IonContent;
  api;
  user;
  country: string;
  groupName;
  message;
  messagesPerMinute = 2;
  chats;
  selectedChat;
  participants = [];
  count;
  fullChannel;

  constructor(
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private dataService: DataService
  ) {}

  clear() {
    localStorage.removeItem('api_id');
    localStorage.removeItem('api_hash');
  }

  async ngOnInit() {
    try {
      let api_id = this.dataService.config?.api_id;
      let api_hash = this.dataService.config?.api_hash;

      if (!api_id && !api_hash) {
        this.navCtrl.navigateRoot('/config');
        return;
      }

      const loading = await this.loadingCtrl.create({ duration: 5000 });
      loading.present();

      this.api = new MTProto({
        api_id,
        api_hash,
      });

      loading.dismiss();

      await this.initUser();
      const result = await this.api.call('help.getNearestDc');
      this.country = result.country;
    } catch (error) {
      await this.handleError(error);
      console.log('ngOnInit error', error);
      this.clear();
    }
  }

  async findGroup() {
    try {
      const users = await this.api.call('messages.getAllChats', {
        except_ids: [],
      });
      console.log('users', users);

      const chats = users.chats.filter((_) => _.title.includes(this.groupName));
      this.chats = chats;
      console.log('this.chats', this.chats);
    } catch (error) {
      await this.handleError(error);
      console.log('findGroup', error);
      let toast = await this.toastCtrl.create({
        message: error.message,
        duration: 3000,
      });
      toast.present();
    }
  }

  async loadChannel() {
    this.participants = [];
    delete this.fullChannel;
    if (this.selectedChat._ == 'chat') {
      const fullChat = await this.api.call('messages.getFullChat', {
        chat_id: this.selectedChat.id,
        access_hash: this.selectedChat.access_hash,
      });
      this.participants = fullChat.users;
    }
    if (this.selectedChat._ == 'channel') {
      const fullChannel = await this.api.call('channels.getFullChannel', {
        channel: {
          _: 'inputChannel',
          channel_id: this.selectedChat.id,
          access_hash: this.selectedChat.access_hash,
        },
      });
      this.fullChannel = fullChannel;
    }
  }

  async getParticipants(count = 10, search = '') {
    if (count >= this.fullChannel?.full_chat?.participants_count) {
      count = this.fullChannel?.full_chat?.participants_count;
    }
    const hash =
      Math.ceil(Math.random() * 0xffffff) + Math.ceil(Math.random() * 0xffffff);
    this.participants = [];
    try {
      for (let counter = 1; this.participants.length < counter; ) {
        console.log('Search', counter, this.participants.length);
        let participants = await this.api.call('channels.getParticipants', {
          channel: {
            _: 'inputChannel',
            channel_id: this.selectedChat.id,
            access_hash: this.selectedChat.access_hash,
          },
          filter: {
            _: 'channelParticipantsSearch',
            q: search, // Suche nach ...
          },
          offset: this.participants.length,
          limit: count,
          hash,
        });
        if (counter === 1) {
          counter = count || participants.count;
        }
        participants.users.forEach((u) => this.participants.push(u));
      }
    } catch (e) {
      await this.handleError(e);
      console.log('Too many requests?', e);
    }

    console.log('this.participants', this.participants);
  }

  async sendMessageToUsers() {
    console.log(this.participants);
    if (+this.messagesPerMinute < 1) {
      return alert('Bitte mindestens 1 Nachricht pro Minute versenden!');
    }
    const loading = await this.loadingCtrl.create({
      message: 'Sending messages...',
    });
    // loading.present();
    try {
      await this.asyncForEach(this.participants, async (_) => {
        _.loading = true;
        _.status = 'loading';

        const hasChat = await this.hasChatWithUser(_.id, _.access_hash);
        console.log('hasChat', hasChat);
        if (!hasChat) {
          console.log('sendMessage -> ', _, this.message);
          try {
            /*await this.api.call('messages.sendMessage', {
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
            });*/
            _.status = 'success';
          } catch (error) {
            console.log('Error sending message', error);
            _.status = 'error';
            _.error = JSON.stringify(error);
          }
          await this.sleep(60_000 / +this.messagesPerMinute);
        } else {
          _.status = 'warning';
          _.error = 'User already in chat';
        }
        _.loading = false;
      });
    } catch (error) {
      await this.handleError(error);
      console.log('sendMessageToUsers', error);
    } finally {
      loading.dismiss();
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
            },
          });
        } catch (error) {
          await this.handleError(error);
          console.log('error', error);
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
    if (!user) {
      const phone = await prompt('Gebe deine Handynummer ein: ');
      const { phone_code_hash } = await this.sendCode(phone);
      const code = await prompt('Gebe den Code von Telegram ein: ');

      try {
        await this.signIn({
          code,
          phone,
          phone_code_hash,
        });
        this.initUser();
      } catch (error) {
        await this.handleError(error);
        console.log('error', error);
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
      await this.handleError(error);
      // this.clear();
      return null;
    }
  }

  async hasChatWithUser(user_id, access_hash) {
    return new Promise(async (resolve) => {
      try {
        const user = await this.api.call('users.getFullUser', {
          id: {
            _: 'inputUser',
            user_id: user_id,
            access_hash: access_hash,
          },
        });
        console.log('user', user);
        if (user.common_chats_count > 1) {
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (error) {
        resolve(false);
        await this.handleError(error);
      }
    });
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

  async asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  scrollTo(elm) {
    const y = elm.el.offsetTop + 400;

    this.content.scrollToPoint(0, y);
  }

  async handleError(err) {
    if (err?._ === 'mt_rpc_error' && err?.error_message?.match(/FLOOD_WAIT_/)) {
      const wait = Number(err.error_message.match(/\d+/g)[0]);
      const loading = await this.loadingCtrl.create({
        message: `Flood Wait ... ${wait} Sekunden`,
        duration: wait * 1000,
      });
      await loading.present();
      for (let i = 1; i < wait; i++) {
        await this.sleep(1000);
        loading.message = `Flood Wait ... ${wait - i} Sekunden`;
      }
      await loading.dismiss();
      return true;
    }
  }
}
