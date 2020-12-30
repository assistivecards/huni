import React from 'react';
import { StyleSheet, View, SafeAreaView, Dimensions, Image, Text, ScrollView, Animated, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator } from 'react-native';

import API from '../api';
import { titleCase } from "title-case";
import { Image as CachedImage } from "react-native-expo-image-cache";
import * as ScreenOrientation from 'expo-screen-orientation';
import Svg, { Line, Path, Circle } from 'react-native-svg';

import TouchableScale from 'touchable-scale-btk';

export default class Setting extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      packs: [],
      search: false,
      searchToggleAnim: new Animated.Value(0),
      term: "",
      orientation: "portrait"
    }

    ScreenOrientation.getOrientationAsync().then(orientation => {
      if(orientation == 3 || orientation == 4){
        this.setState({orientation: "landscape"});
      }
    })
  }

  componentDidMount(){
    API.hit("Home");
    API.event.on("refresh", this._refreshHandler)
    API.event.on("premium", this._refreshHandler)
    this.getPacks();
    this.orientationSubscription = ScreenOrientation.addOrientationChangeListener(this._orientationChanged.bind(this));
  }

  _orientationChanged(orientation){
    let newOrientation = "portrait";
    if(orientation.orientationInfo.orientation == 3 || orientation.orientationInfo.orientation == 4){
      newOrientation = "landscape";
    }
    this.setState({orientation: newOrientation});
  }

  _refreshHandler = () => {
    console.log("refreshed here");
    this.forceUpdate();
    this.getPacks(true);
  };

  componentWillUnmount(){
    ScreenOrientation.removeOrientationChangeListener(this.orientationSubscription);
    API.event.removeListener("refresh", this._refreshHandler);
    API.event.removeListener("premium", this._refreshHandler);
  }

  openSettings(){
    if(API.isOnline){
      this.props.navigation.navigate("Settings");
    }else{
      alert("You are offline!");
    }
  }


  async getPacks(packs, force){
    let allPacks = await API.getPacks(force);
    this.setState({packs: allPacks});

    API.ramCards(packs, force);
  }

  openCards(pack, packIndex){
    let open = "pack";
    if(pack.premium == 1){
      if(!API.isPremium()){
        open = "premium";
      }
    }

    if(open == "pack"){
      this.props.navigation.push("Cards", {pack, packs: this.state.packs, packIndex, orientation: this.state.orientation});
    }else if(open == "premium"){
      this.props.navigation.push("Premium");
    }

  }

  renderPacks(){
    if(this.state.packs.length){
      return(
        this.state.packs.map((pack, i) => {
          let showPremium = false;
          if(!API.isPremium() && pack.premium == 1) showPremium = true;

          return (
            <TouchableScale key={i} style={[this.state.orientation == "portrait" ? styles.categoryItem : styles.categoryItemLandscape, {height: API.isTablet ? 170 : 110}]} onPress={() => this.openCards(pack, i)}>
              <View style={styles.categoryItemInner}>
                <View style={{flex: 1, flexDirection: "row", alignItems: "center"}}>
                  <View style={{backgroundColor: pack.color, borderRadius: 200, padding: 15, marginRight: 15}}>
                    <CachedImage uri={`${API.assetEndpoint}cards/icon/${pack.slug}.png?v=${API.version}`} style={{width: API.isTablet ? 85 : 45, height: API.isTablet ? 85 : 45}}/>
                  </View>
                  <View>
                    <Text style={[styles.categoryItemText, {fontSize: API.isTablet ? 25 : 18, marginBottom: 3}]}>{titleCase(pack.locale)}</Text>
                    <Text style={[styles.categoryItemText, {fontSize: API.isTablet ? 23 : 16, fontWeight: "normal", opacity: 0.8, marginTop: 2}]}>{pack.count} Training Words</Text>
                  </View>
                </View>
                {!showPremium &&
                  <View style={{paddingHorizontal: 12, height: 38, backgroundColor: "#92c9cc", flexDirection: "row", justifyContent: "center", alignItems: "center", borderRadius: 20}}>
                    <Svg width={26} height={26} viewBox="0 0 24 24" strokeLinecap="round" strokeWidth="2" stroke="#000" fill="none" style={{opacity: 0.7}}>
                      <Path stroke="none" d="M0 0h24v24H0z"/>
                      <Line x1="5" y1="12" x2="19" y2="12" />
                      <Line x1="13" y1="18" x2="19" y2="12" />
                      <Line x1="13" y1="6" x2="19" y2="12" />
                    </Svg>
                  </View>
                }
                {showPremium &&
                  <View style={{paddingHorizontal: 12, height: 38, backgroundColor: "#a2ddfd", flexDirection: "row", justifyContent: "center", alignItems: "center", borderRadius: 20}}>
                    <Text style={{color: "#000", fontWeight: "bold", fontSize: 16, opacity: 0.55}}>{API.t("home_premium")}</Text>
                  </View>
                }
              </View>
            </TouchableScale>
          )
        })
      );
    }else{
      return (
        <View style={{flex: 1, justifyContent: "center", alignItems: "center", height: 600}}>
          <ActivityIndicator color={API.config.backgroundColor}/>
        </View>
      )
    }
  }

  render() {

    return(
      <View style={{flex: 1}}>
        <SafeAreaView></SafeAreaView>
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode={"on-drag"}>
        <SafeAreaView style={{flex: 1}}>
          <View style={{flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start"}}>
            <View style={{flexDirection: "row", justifyContent: "space-between", alignItems: "center", flex: 1}}>
              <TouchableOpacity style={styles.avatarHolder} onPress={() => this.openSettings()}>
                <View style={styles.avatar}>
                  <CachedImage uri={`${API.assetEndpoint}cards/avatar/${API.user.avatar}.png?v=${API.version}`}
                    style={{width: 40, height: 40, position: "relative", top: 4}}
                    resizeMode={"contain"}
                    />
                </View>
                <View style={styles.avatarIcon}>
                  <Svg width={11} height={11} viewBox="0 0 8 4">
                    <Line x1="1" x2="7" y1="0.8" y2="0.8" fill="none" stroke={API.config.backgroundColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1"/>
                    <Line x1="1" x2="7" y1="3.2" y2="3.2" fill="none" stroke={API.config.backgroundColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1"/>
                  </Svg>
                </View>
              </TouchableOpacity>
              <View style={{flex: 1}}></View>
              <TouchableScale onPress={() => this.openSettings()} style={{paddingHorizontal: 12, height: 38, marginTop: 5, backgroundColor: "#a2ddfd", flexDirection: "row", justifyContent: "center", alignItems: "center", borderRadius: 20, marginHorizontal: 25}}>
              <Svg width={24} height={24} viewBox="0 0 24 24" strokeLinecap="round" strokeWidth="2" stroke="#000" fill="none" style={{opacity: 0.7, marginRight: 5}}>
                <Path d="M0 0h24v24H0z" stroke="none"/>
              	<Path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              	<Circle cx="12" cy="12" r="3"/>
              </Svg>
                <Text style={{color: "#000", fontWeight: "bold", fontSize: 16, opacity: 0.55}}>{API.t("home_settings")}</Text>
              </TouchableScale>
            </View>
            <Text style={[API.styles.h2, {fontWeight: "500", color: "#333", marginBottom: 0, marginTop: 25}]}>{API.t("home_title")}</Text>
          </View>
          </SafeAreaView>

          <SafeAreaView>
            <View style={{padding: 15, flexDirection: "row", flexWrap: "wrap"}}>{this.renderPacks()}</View>
            <View style={{marginHorizontal: 20, marginVertical: 10, backgroundColor: "#fafafa", borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "flex-start"}}>
              <Image source={require("../assets/icon.png")} style={{width: 70, height: 70, borderRadius: 70, marginLeft: 12, marginRight: 5}}/>
              <View style={{marginHorizontal: 10, flex: 1}}>
                <Text style={[API.styles.h3, {marginHorizontal: 0, marginBottom: 3}]}>More training packs on the way!</Text>
                <Text style={[API.styles.p, {marginBottom: 15, marginHorizontal: 0}]}>We are constantly updating and adding new packs for training.</Text>
              </View>
            </View>
          </SafeAreaView>
        </ScrollView>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  carrier: {
    flex: 1,
    backgroundColor: "#fff",
    height: "100%"
  },
  header: {
    backgroundColor: API.config.backgroundColor
  },
  avatar: {
    marginHorizontal: 30, padding: 2, backgroundColor: "#fff", borderRadius: 40, overflow: "hidden",
    width: 45,
    height: 45,
    marginTop: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee"
  },
  avatarHolder: {
    position: "relative"
  },
  avatarIcon: {
    backgroundColor: "#fff",
    width: 18,
    height: 18,
    position: "absolute",
    bottom: -2,
    right: 28,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  categoryItem: {
    width: "100%"
  },
  categoryItemLandscape: {
    width: "50%"
  },
  board: {
    justifyContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 15
  },
  categoryItemInner: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    flex: 1,
    margin: 5,
    marginHorizontal: 10,
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  categoryItemText:{
    fontWeight: "bold",
    color: "rgba(0,0,0,0.75)"
  },
  tabStyle: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 20
  },
  tabStyleText: {
    fontWeight: "bold",
    fontSize: 17
  },
  tabStyleActive: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: API.config.backgroundColor,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  tabStyleActiveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17
  },
  tabHolder: {
    flex: 1, flexDirection: "row", alignItems: "center",
    marginLeft: 20,
    marginTop: 10,
    height: 60,
  }
});
