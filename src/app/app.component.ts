import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DataService } from './data.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    private dataService: DataService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    const config = localStorage.getItem('config');
    if (config) {
      this.dataService.config = JSON.parse(config);
    } else {
      this.navCtrl.navigateRoot('/config');
    }
  }
}
