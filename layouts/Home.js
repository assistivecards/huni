import React from 'react';
import { StyleSheet, View, SafeAreaView, Dimensions, Image, Text, ScrollView, Animated, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator } from 'react-native';

import API from '../api';
import titleCase from '../js/titleCase';
import { Image as CachedImage } from "react-native-expo-image-cache";
import * as ScreenOrientation from 'expo-screen-orientation';
import Svg, { Line, Path, Circle } from 'react-native-svg';

import TouchableScale from '../components/touchable-scale'

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
    this.getPacks();
    this.orientationSubscription = ScreenOrientation.addOrientationChangeListener(this._orientationChanged.bind(this));

    API.event.on("announce", this._announcer.bind(this))
  }

  _orientationChanged(orientation){
    let newOrientation = "portrait";
    if(orientation.orientationInfo.orientation == 3 || orientation.orientationInfo.orientation == 4){
      newOrientation = "landscape";
    }
    this.setState({orientation: newOrientation});
  }

  _refreshHandler = () => {
    this.forceUpdate();
    this.getPacks(true);
  };

  _announcer = (card) => {
    this.props.navigation.push("Announcer", {
      card: API.getCardData(card.slug, card.pack),
      pack: this.state.packs.filter(pack => pack.slug == card.pack)[0],
      orientation: this.state.orientation
    });
  };

  componentWillUnmount(){
    ScreenOrientation.removeOrientationChangeListener(this.orientationSubscription);
    API.event.removeListener("refresh", this._refreshHandler);
    API.event.removeListener("announce", this._announcer);
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
    this.props.navigation.push("Cards", {pack, packs: this.state.packs, packIndex, orientation: this.state.orientation});
  }

  renderPacks(){
    if(this.state.packs.length){
      return(
        this.state.packs.map((pack, i) => {
          return (
            <TouchableScale key={i} style={[this.state.orientation == "portrait" ? styles.categoryItem : styles.categoryItemLandscape, {height: API.isTablet ? 160 : 100, opacity: pack.premium ? 0.5 : 1}]} onPress={() => this.openCards(pack, i)}>
              <View style={[styles.categoryItemInner]}>
                <View style={{borderWidth: 1, borderColor: "#666", width: 20, height: 20, backgroundColor: pack.color, borderRadius: 10, margin: 20, marginRight: 0}}></View>
                <CachedImage uri={`${API.assetEndpoint}cards/icon/${pack.slug}.png?v=${API.version}`} style={{width: API.isTablet ? 90 : 50, height: API.isTablet ? 90 : 50, margin: 15, marginBottom: 10}}/>
                <View>
                  <Text style={[styles.categoryItemText, {fontSize: API.isTablet ? 25 : 18, marginBottom: 3}]}>{titleCase(pack.locale)}</Text>
                  <Text style={[styles.categoryItemText, {fontSize: API.isTablet ? 23 : 16, fontWeight: "normal", opacity: 0.8, marginTop: 2}]}>{pack.count} Words & {pack.count * 4} Phrases</Text>
                </View>
              </View>
            </TouchableScale>
          )
        })
      );
    }else{
      return (
        <View style={{flex: 1, justifyContent: "center", alignItems: "center", height: 300}}>
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
          <View style={{flexDirection: API.user.isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", height: 60}}>
            <View style={{flex: 1}}>
              <Text style={[API.styles.h2, {padding: 0, margin: 0, color: "#000"}]}>Choose a category</Text>
            </View>
            <TouchableOpacity style={styles.avatarHolder} onPress={() => this.openSettings()}>
              <View style={styles.avatar}>
                <Svg width={32} height={32} viewBox="0 0 24 24" stroke="#000" strokeLinecap="round" strokeWidth="2">
                  <Path d="M0 0h24v24H0z" stroke="none"/>
                  <Path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <Circle cx="12" cy="12" r="3"/>
                </Svg>
              </View>
            </TouchableOpacity>
          </View>
          <SafeAreaView>
            <View style={{padding: 15}}>{this.renderPacks()}</View>
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
    marginHorizontal: 30, padding: 2, backgroundColor: "#a5d5ff", borderRadius: 40, overflow: "hidden",
    width: 45,
    height: 45,
    marginTop: 5,
    justifyContent: "center",
    alignItems: "center"
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
    flex: 1, borderRadius: 20,
    margin: 5,
    backgroundColor: "#fafafa"
  },
  categoryItemText:{
    fontWeight: "bold",
    color: "rgba(0,0,0,0.75)"
  }
});
