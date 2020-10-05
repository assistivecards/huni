import Storage from 'react-native-storage';
import { AsyncStorage, Platform, Alert } from 'react-native';

import * as Speech from 'expo-speech';
import * as Localization from 'expo-localization';
import * as Haptics from 'expo-haptics';
import * as Permissions from 'expo-permissions';
import * as Device from 'expo-device';
import * as InAppPurchases from 'expo-in-app-purchases';
import * as Notifications from 'expo-notifications';

import { Analytics, ScreenHit, Event as Avent } from 'expo-analytics-safe';
import { CacheManager } from "react-native-expo-image-cache";
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';

import Event from './js/event';
import makeid from './js/makeid';
import styles from './js/styles';

const APP = require("./app.json");
// For test cases
const _DEVELOPMENT = false;

const _NETWORK_STATUS = true;
const _FLUSH = true;
const _DEVUSERIDENTIFIER = "109677539152659927717";
const _DEVLOCALE = "en-US";
const _ISPREMIUM = false;

const enUI = require("./interface/en.json");

const ANALYTICS_KEY = APP.analyticsKey;
const API_ENDPOINT = APP.apiEndpoint;
const ASSET_ENDPOINT = APP.assetEndpoint;
const ASSET_VERSION = APP.assetVersion;
const RTL = ["ar","ur","he"];

let storage = new Storage({
	size: 1000,
	storageBackend: Platform.OS === "web" ? localStorage : AsyncStorage,
	defaultExpires: null,
	enableCache: true,
	sync: {}
});

class Api {
  constructor(){
		if(_DEVELOPMENT && _FLUSH){
			AsyncStorage.clear();
			CacheManager.clearCache();
		}
		this.user = {};
		this.cards = {};
		this.storeId = APP.storeId;
		this.uitext = {en: enUI};
		this.searchArray = [];
		this.development = _DEVELOPMENT;
		this.styles = styles;
		this.config = APP.config;
		this.event = Event;
		this.language = "en";
		this.analytics = new Analytics(_DEVELOPMENT ? "DEVELOPMENT" : ANALYTICS_KEY, {slug: APP.name, name: APP.displayName, version: APP.expo.version});
		this.isTablet = false;
		this._checkIfTablet();

		this.version = ASSET_VERSION;
		this.assetEndpoint = ASSET_ENDPOINT;

		if(_DEVELOPMENT){
			this.isOnline = _NETWORK_STATUS;
		}else{
			this.isOnline = true;
		}

		this.locked = true;
		this.premium = "determining";
		this.premiumPlans = [];

    console.log("API: Created instance");
		if(!_DEVELOPMENT){
			this._listenNetwork();
		}
		this._initSubscriptions();
  }

	hit(screen){
		this.analytics.hit(new ScreenHit(screen))
		  .then(() => {
				// hit done
			})
		  .catch(e => console.log(e.message));
	}

	avent(a,b,c){
		this.analytics.event(new Avent(a, b, c))
	}

	_listenNetwork(){
		NetInfo.addEventListener(state => {
		  console.log('Connection type', state.type);
		  console.log('Is connected?', state.isConnected);
			this.isOnline = state.isConnected;
		});
	}

	async _checkIfTablet(){
		let deviceType = await Device.getDeviceTypeAsync()

		this.isTablet = deviceType == Device.DeviceType.TABLET;
	}

	isPremium(){
		if(_DEVELOPMENT){
			return _ISPREMIUM;
		}

		if(this.premium.includes("lifetime")){
			return true;
		}

		if(this.premium.includes("lifetime") || this.premium.includes("yearly") || this.premium == this.premium.includes("monthly")){
			return true;
		}else{
			if(this.isGift){
				return true;
			}else{
				return false;
			}
		}
	}

	haptics(style){
		if(Platform.OS != "web"){
			if(this.user.haptic !== "0"){
				switch (style) {
					case "touch":
						Haptics.selectionAsync()
						break;
					case "impact":
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
						break;
					default:
						Haptics.selectionAsync()
				}
			}
		}else{
			console.log("BZZ");
		}
	}

	async registerForPushNotificationsAsync() {
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      },
    });

    let experienceId = undefined;
    if (!Constants.manifest) {
      // Absence of the manifest means we're in bare workflow
      experienceId = '@burak/'+APP.name;
    }

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      experienceId,
    });

    console.log(expoPushToken.data);
    this.scheduleNotif();
  }

  async scheduleNotif(){
    let scheduledNotifs = await Notifications.getAllScheduledNotificationsAsync();
    console.log("##Notif", scheduledNotifs);
    if(scheduledNotifs.length == 0){

      let content = {
        sound: 'default',
        title: this.t("setup_notification_badge_title"),
        body: this.t("setup_notification_badge_description"),
      };

      Notifications.scheduleNotificationAsync({
        content: content,
        trigger: {
          seconds: 60*60*24*2, // 2 days = 60*60*24*2
          repeats: true
        },
      });
    }
  }

	async setup(profile){
		let lang = profile.language ? profile.language : "en";
		let voice = await this.getBestAvailableVoiceDriver(lang);
		let user = {
			name: profile.name,
			avatar: profile.avatar,
			voice: voice.identifier,
			language: lang,
			haptic: 1
		}

		await this.setData("user", JSON.stringify(user));
		console.log("Setup completed.");
		this.user = user;
	}

	signout(){
    Alert.alert(
      this.t("alert_signout_title"),
      this.t("alert_signout_description"),
      [
        {
          text: this.t("alert_cancel"),
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        { text: this.t("alert_ok"), onPress: () => {
					//AsyncStorage.clear();
					this.event.emit("refresh", "signout");
				} }
      ],
      { cancelable: true }
    );
  }

	async update(fields, values){
		let user = JSON.parse(await this.getData("user"));
		fields.forEach((itemProperty, i) => {
			user[itemProperty] = values[i];
		});

		this.user = user;

		await this.setData("user", JSON.stringify(user));
	}

	speak(text, speed){
		//text = this.phrase()
		let rate = 1;
		if(speed == "slow"){
			rate = 0.5;
		}
		if(this.user.voice != "unsupported"){
			Speech.speak(text, {
				voice: this.user.voice,
				language: this.language,
				pitch: 1,
				rate: rate
			});
		}
	}

	async getAvailableVoicesAsync(recall){
		let voices = await Speech.getAvailableVoicesAsync();
		if(voices.length == 0){
			if(recall){
				return [];
			}else{
				await new Promise(function(resolve) {
		        setTimeout(resolve, 1000);
		    });
				return await this.getAvailableVoicesAsync(true);
			}
		}else{
			return voices;
		}
	}

	async getBestAvailableVoiceDriver(language){
		let allVoices = await this.getAvailableVoicesAsync();
		let voices = allVoices.filter(voice => voice.language.includes(language));

		if(voices.length == 0){
			return "unsupported";
		}else if(voices.length == 1){
			return voices[0];
		}else if(voices.length > 1){
			let localeString = this.localeString().toLowerCase().replace(/_/g, "-");
			let localeVoices = voices.filter(voice => localeString.includes(voice.language.toLowerCase().replace(/_/g, "-")));

			if(localeVoices.length == 0){
				// check if there is an enhanced one
				return voices.sort((a, b) => {
	          let aQ = !(a.quality == "Enhanced");
	          let bQ = !(b.quality == "Enhanced");
	          if (aQ < bQ) return -1
	          if (aQ > bQ) return 1
	          return 0
	      })[0];
			}else if(localeVoices.length == 1){
				return localeVoices[0];
			}else if(localeVoices.length > 1){
				// check if there is an enhanced one
				return localeVoices.sort((a, b) => {
	          let aQ = !(a.quality == "Enhanced");
	          let bQ = !(b.quality == "Enhanced");
	          if (aQ < bQ) return -1
	          if (aQ > bQ) return 1
	          return 0
	      })[0];
			}
		}
	}

	async getPacks(force){
		var url = ASSET_ENDPOINT + "packs/" + this.language + "/metadata.json?v="+this.version;

		if(this.packs && force == null){
			console.log("pulling from ram");
			return this.packs;
		}else{
			let packsResponse;
			try {
				packsResponse = await fetch(url, {cache: "no-cache"})
		    .then(res => res.json());
				this.setData("packs", JSON.stringify(packsResponse));

			} catch(error){
				console.log("Offline, Falling back to cached packdata!", error);
				let packsResponseString = await this.getData("packs");
				if(packsResponseString){
					packsResponse = JSON.parse(packsResponseString);
				}
			}
			this.packs = packsResponse;
			return packsResponse;
		}
	}

	async ramCards(slugArray, force){
		// We need to ram things hereé!
	}

	async _initSubscriptions(){
    try{
			if(_DEVELOPMENT){
				if(!_ISPREMIUM){
					this.premium = "none";
					this.event.emit("premium");
				}
			}

	    if(!Constants.isDevice) {
				this.premium = "none";
				this.event.emit("premium");
			}
			await InAppPurchases.connectAsync();

			InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
				// Purchase was successful
				if (responseCode === InAppPurchases.IAPResponseCode.OK) {
					results.forEach(async (purchase) => {
						if (!purchase.acknowledged) {
							console.log(`Successfully purchased ${purchase.productId}`);
							// Process transaction here and unlock content...

							this.premium = purchase.productId;

							let consume = (purchase.productId == "lifetime");
							console.log("Should I consume?", consume);
							// Then when you're done
							let resfinish = await InAppPurchases.finishTransactionAsync(purchase, consume);
							alert(`Successfully purchased ${purchase.productId.replace(APP.planPrefix, "")}, you can now use the premium version of the app!`);
							this.event.emit("premium");
							this.event.emit("premiumPurchase", this.premium);
							this.setData("premium", this.premium);
							this.event.emit("refresh");
						}
					});
				}

				// Else find out what went wrong
				if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
					console.log('User canceled the transaction');
				} else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
					console.log('User does not have permissions to buy but requested parental approval (iOS only)');
				} else {
					console.warn(`Something went wrong with the purchase. Received errorCode ${responseCode}`);
				}
			});

      const history = await InAppPurchases.getPurchaseHistoryAsync(true);
			if (history.responseCode === InAppPurchases.IAPResponseCode.OK) {
			  // get to know if user is premium or npt.
				console.log(history.results);
				let lifetime = history.results.filter(res => res.productId == "lifetime")[0];
				if(lifetime){
					this.premium = "lifetime";
				}else{
					let orderedHistory = history.results.sort((a, b) => (a.purchaseTime > b.purchaseTime) ? 1 : -1);
					if(orderedHistory[0]){
						this.premium = orderedHistory[0].productId;
					}else{
						this.premium = "none";
					}
				}

				this.event.emit("premium");
				await this.setData("premium", this.premium);

				this.getPlans(); // async fetch the plans for later use.

			}else{
				console.log("#### Appstore status is not ok.");
				this.premium = await this.getData("premium");
				if(!this.premium) {
					this.premium = "none";
					this.setData("premium", "none");
				}
				this.event.emit("premium");
			}

    } catch(err){
      console.log("###### maybe no internet, or the app reloaded in dev mode", err);
			this.premium = await this.getData("premium");
			if(!this.premium) {
				this.premium = "none";
				this.setData("premium", "none");
			}
			this.event.emit("premium");
    }
	}

	async getPlans(){
		if(this.premiumPlans.length != 0){
			return this.premiumPlans;
		}else{
			try {
	      const { responseCode, results } = await InAppPurchases.getProductsAsync([APP.planPrefix + "monthly", APP.planPrefix + "yearly", APP.planPrefix + "lifetime"]);
				console.log("plans", results);
				if (responseCode === InAppPurchases.IAPResponseCode.OK) {
					this.premiumPlans = results;
				}
			}catch (err) {
				console.log("Issues with fetching products: ", err);
			}
			return this.premiumPlans;
		}
	}

	async purchasePremium(productId, oldProductId){
		if(oldProductId && oldProductId != "none"){
			await InAppPurchases.purchaseItemAsync(productId, oldProductId);
		}else{
			await InAppPurchases.purchaseItemAsync(productId);
		}
		this.avent("Premium", "PurchaseClick", productId);

	}

	async getCards(slug, force){
		var url = ASSET_ENDPOINT + "packs/" + this.language + "/"+ slug +".json?v="+this.version;

		if(this.cards[slug] && force == null){
			console.log("pulling from ram", "cardsFor", slug);
			return this.cards[slug];
		}else{
			let cardsResponse;
			try {
				cardsResponse = await fetch(url, {cache: "no-cache"})
				.then(res => res.json());
				this.setData("cards:"+slug, JSON.stringify(cardsResponse));

			} catch(error){
				console.log("Offline, Falling back to cached cardData!", error, slug);
				let cardsResponseString = await this.getData("cards:"+slug);
				if(cardsResponseString){
					cardsResponse = JSON.parse(cardsResponseString);
				}
			}
			this.cards[slug] = cardsResponse;
			return cardsResponse;
		}
	}

	getCardData(slug, pack){
		console.log(slug, pack);
		return this.cards[pack].filter(ramCard => ramCard.slug == slug)[0];
	}

	localeString(){
		if(_DEVELOPMENT){
			return _DEVLOCALE;
		}else{
			return Localization.locales.join("|");
		}
	}

	async getIdentifier(){
		if(_DEVELOPMENT && Platform.OS === 'android'){
			return _DEVUSERIDENTIFIER;
		}
		return await this.getData("identifier");
	}

	t(UITextIdentifier, variableArray){
		let lang = "en";
		if(this.user){
			lang = this.language
		}else{
			lang = Localization.locale.substr(0, 2);
		}

		if(!this.uitext[lang]){
			lang = "en";
		}

		if(typeof variableArray == "string" || typeof variableArray == "number"){
			let text = this.uitext[lang][UITextIdentifier];
			if(text) return text.replace("$1", variableArray);
			return "UnSupportedIdentifier";
		}else if(typeof variableArray == "array"){
			let text = this.uitext[lang][UITextIdentifier];
			if(text){
				variableArray.forEach((variable, i) => {
					let variableIdentifier = `${i+1}`;
				 	text = text.replace(variableIdentifier, variable);
				});
				return text;
			}else{
				return "UnSupportedIdentifier";
			}

		}else{
			let text = this.uitext[lang][UITextIdentifier];
			if(text) return text;
			return "UnSupportedIdentifier";
		}
	}

  setData(key, data){
		return storage.save({key, data});
  }

  async getData(key){
    // returns promise
		try {
			return await storage.load({key});
		} catch (error) {
			return "";
		}
  }
}

const _api = new Api();
export default _api;
