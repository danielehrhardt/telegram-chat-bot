import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DataService } from '../data.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.page.html',
  styleUrls: ['./config.page.scss'],
})
export class ConfigPage implements OnInit {
  constructor(
    public dataService: DataService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {}

  save() {
    localStorage.setItem('config', JSON.stringify(this.dataService.config));
    this.navCtrl.navigateBack('/home');
  }
}
