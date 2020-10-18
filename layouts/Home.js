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
    if(pack == "random"){
      this.props.navigation.push("Cards", {pack: {slug: "random", title: "Random"}, packs: this.state.packs, orientation: this.state.orientation});
    }else{
      this.props.navigation.push("Cards", {pack, packs: this.state.packs, packIndex, orientation: this.state.orientation});
    }
  }

  renderPacks(){
    if(this.state.packs.length){
      return(
        this.state.packs.map((pack, i) => {
          return (
            <TouchableScale key={i} style={[this.state.orientation == "portrait" ? styles.categoryItem : styles.categoryItemLandscape, {height: API.isTablet ? 160 : 100, opacity: pack.premium ? 0.5 : 1}]} onPress={() => this.openCards(pack, i)}>
              <View style={[styles.categoryItemInner, {backgroundColor: pack.color}]}>
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
        <SafeAreaView style={{flex: 1}}>
          <View style={{flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 60}}>
            <View style={styles.tabHolder}>
              <View style={styles.tabStyleActive}>
                <Text style={styles.tabStyleActiveText}>Categories</Text>
              </View>
              <View style={{width: 10}}></View>
              <TouchableOpacity style={styles.tabStyle} onPress={() => this.openCards("random", 0)}>
                <Text style={styles.tabStyleText}>Randomly</Text>
              </TouchableOpacity>
            </View>

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
          </View>
          </SafeAreaView>

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
    flex: 1, borderRadius: 20,
    margin: 5,
    backgroundColor: "#fafafa"
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
