import React from 'react';
import { StyleSheet, Text, View, ScrollView, Animated, ActivityIndicator, Dimensions, TouchableWithoutFeedback, TouchableOpacity, LayoutAnimation, Platform, RefreshControl, PanResponder, Image as RNImage, Easing, SafeAreaView  } from 'react-native';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import { Image } from 'react-native-elements';
import { Image as CachedImage } from "react-native-expo-image-cache";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';

import API from '../api'
import { titleCase } from "title-case";

import TopBar from '../components/TopBar'
import Trainer from '../components/Trainer'
import TouchableScale from 'touchable-scale-btk';

export default class App extends React.Component {
  constructor(props){
    super(props);
    this.windowHeight = Dimensions.get('window').height;
    this.offsetValue = 0;
    this.valueListener = null;

    this.pack = this.props.navigation.getParam("pack");
    this.cards = this.props.navigation.getParam("cards");

    this.state = {
      orientation: this.props.navigation.getParam("orientation"),
      pop: new Animated.Value(0),
      pan: new Animated.ValueXY({x: 0, y: this.windowHeight}),
      scrollerHeight: 0,
      done: false
    }

    this.valueListener = this.state.pan.addListener((value) => {
      this.offsetValue = value.y
    });

    this.state.panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        return gestureState.dx != 0 && gestureState.dy != 0;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return gestureState.dx != 0 && gestureState.dy != 0;
      },
      onPanResponderGrant: (evt, gestureState) => {
        this.state.pan.setOffset({x: 0, y: this.offsetValue});
        this.state.pan.setValue({x: 0, y: 0});
      },
      onPanResponderMove: Animated.event([
        null,
        {
          dy: this.state.pan.y
        }
      ],{useNativeDriver: false}),
      onPanResponderRelease: (e, {vx, vy}) => {
        this.state.pan.flattenOffset();

        let yVal = this.state.pan.y._value;
        let maxToYVal = this.windowHeight - this.state.scrollerHeight;

        if(yVal > 70) {
          this.closeModal();
        }else{
          if(maxToYVal > 0){
            Animated.spring(this.state.pan, {
              toValue: {x: 0, y: 0},
              useNativeDriver: true
            }).start()
          }else{

            if (yVal > 0 || yVal < maxToYVal){
              let toYVal = 0;
              if(yVal < maxToYVal){
                toYVal = maxToYVal;
              }
              Animated.spring(this.state.pan, {
                toValue: {x: 0, y: toYVal},
                useNativeDriver: true
              }).start()
            }else{
              Animated.decay(this.state.pan, {
                velocity: {x: 0, y: vy},
                deceleration: 0.989,
                useNativeDriver: true
              }).start()
            }
          }
        }
      }
    });

  }

  componentDidMount(){
    Animated.timing(
      this.state.pop,
      {
        toValue: 1,
	      duration: 200,
        useNativeDriver: false
      }
    ).start();

    Animated.spring(
      this.state.pan,
      {
        bounciness: 4, toValue: { x: 0, y: 0 },
        useNativeDriver: true
      }
    ).start();

    API.hit("Training:"+this.pack.slug);
    this.orientationSubscription = ScreenOrientation.addOrientationChangeListener(this._orientationChanged.bind(this));
  }

  _orientationChanged(orientation){
    let newOrientation = "portrait";
    if(orientation.orientationInfo.orientation == 3 || orientation.orientationInfo.orientation == 4){
      newOrientation = "landscape";
    }
    this.setState({orientation: newOrientation});
  }

  componentWillUnmount(){
    this.state.pan.removeListener(this.valueListener);
    ScreenOrientation.removeOrientationChangeListener(this.orientationSubscription);
  }

  closeModal(){
    API.haptics("impact");

    Animated.timing(
      this.state.pop,
      {
        toValue: 0,
	      duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false
      }
    ).start(() => {
      this.props.navigation.pop();
      API.haptics("touch");

    });

    Animated.spring(
      this.state.pan, // Auto-multiplexed
      {
        speed: 3,
        toValue: { x: 0, y: this.windowHeight},
        useNativeDriver: true
      }
    ).start();
  }

  _getPopInt = (from, to) => {
      const { pop } = this.state;

      return pop.interpolate({
          inputRange: [0, 1],
          outputRange: [from, to],
          extrapolate: 'clamp',
          useNativeDriver: true
      });
  }

  speak(text, speed){
    API.haptics("touch");
    API.speak(text, speed);
  }

  done(){
    this.setState({done: true})
  }

  main(){
    this.closeModal();
    setTimeout(() => {
      this.props.navigation.pop();
    }, 200);
  }

  render() {

    return (
      <View style={{flex: 1}}>
        <Animated.View style={{flex: 1, opacity: this._getPopInt(0,1), backgroundColor: Platform.OS == "android" ? "rgba(255,255,255,0.95)" :  "rgba(255,255,255,0.2)"}}>
          <View style={{flex: 1, backgroundColor: "#fff"}}>
          </View>
        </Animated.View>
        <Animated.View
          {...this.state.panResponder.panHandlers} style={[{ transform: this.state.pan.getTranslateTransform() }, styles.modal]}>
          <View onLayout={(e) => {
              let {height} = e.nativeEvent.layout;
              this.setState({scrollerHeight: height});
            }}>

            <View style={{flex: 1, height: 600}}>
              {!this.state.done &&
                <Trainer cards={this.cards} done={this.done.bind(this)}/>
              }
              {this.state.done &&
                <View style={{ justifyContent: "center", alignItems: "center", height: this.windowHeight}}>
                  <View style={{flexDirection: "row", justifyContent: "center"}}>
                    <CachedImage uri={`${API.assetEndpoint}cards/icon/${this.pack.slug}.png?v=${API.version}`} style={{width: 100, height: 100, margin: 10}}/>
                    <CachedImage uri={`${API.assetEndpoint}cards/conversation/yes.png?v=${API.version}`} style={{width: 100, height: 100, margin: 10}}/>
                  </View>
                  <Text style={[API.styles.h2, {textAlign: "center", marginTop: 15}]}>{API.t("training_title_great_work")}</Text>
                  <Text style={[API.styles.p, {textAlign: "center"}]}>{API.t("training_desc_done", this.pack.locale)}</Text>

                  <TouchableScale style={[API.styles.button, {flexDirection: "row", width: 260, marginBottom: 10, marginTop: 10}]} onPress={() => this.main()}>
                    <Svg className="icon icon-tabler icon-tabler-caret-right" height="30" width="30" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                      <Path d="M0 0h24v24H0z" stroke="none"/>
                      <Path d="M15 13l4 -4l-4 -4m4 4h-11a4 4 0 0 0 0 8h1"/>
                    </Svg>
                    <Text style={{color: "#fff", fontWeight: "bold", fontSize: 18}}>{API.t("training_button_choose")}</Text>
                  </TouchableScale>

                  <TouchableScale style={[API.styles.button, {flexDirection: "row", backgroundColor: "#fafafa"}]} onPress={() => this.setState({done: false})}>
                    <Svg className="icon icon-tabler icon-tabler-caret-right" height="30" width="30" fill="none" stroke={API.config.backgroundColor} strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                      <Path d="M0 0h24v24H0z" stroke="none"/>
                      <Path d="M15 13l4 -4l-4 -4m4 4h-11a4 4 0 0 0 0 8h1"/>
                    </Svg>
                    <Text style={{color: API.config.backgroundColor, fontWeight: "bold", fontSize: 18}}>{API.t("training_button_restart")}</Text>
                  </TouchableScale>
                </View>
              }
            </View>
          </View>
        </Animated.View>
        {Platform.OS == "ios" &&
          <Animated.View style={{transform: [{translateY: this._getPopInt(200, 0)}]}}>
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)', 'rgba(255,255,255,1)']} style={styles.closeCarrier}>
              <TouchableScale style={[styles.button, {position: "relative", bottom: 10, backgroundColor: "#fca7a7" }]} onPress={() => this.closeModal()}>
                <Svg viewBox="0 0 24 24" width={32} height={32}>
                  <Path fill={"#333"} d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/>
                </Svg>
              </TouchableScale>
            </LinearGradient>
          </Animated.View>
        }
        {Platform.OS == "android" &&
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)', 'rgba(255,255,255,1)']} style={styles.closeCarrier}>
            <TouchableScale style={[styles.button, {position: "absolute", bottom: 20, backgroundColor: "#fca7a7"}]} onPress={() => this.closeModal()}>
              <Svg viewBox="0 0 24 24" width={32} height={32}>
                <Path fill={"#333"} d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/>
              </Svg>
            </TouchableScale>
          </LinearGradient>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  head: {
    marginBottom: 10,
    paddingVertical: 10,
    paddingBottom: 5,
    paddingHorizontal: 30,
  },
  modal: {
    flex: 1,
    position: "absolute",
    top: 0,
    width: "100%",
  },
  content: {
    paddingBottom: 130
  },
  cardHolder: {
    justifyContent: "space-around",
    flexDirection: "row",
    paddingTop: 10,
    alignItems: "center",
    paddingBottom: 10
  },
  image: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10
  },
  button: {
    width: 50,
    height: 50,
    backgroundColor: "#a5d5ff",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center"
  },
  cardMid: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingHorizontal: 40
  },
  selectionIcon: {
    marginRight: 20,
    width: 26,
    height: 26
  },
  closeCarrier: {
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    zIndex: 99,
    width: "100%"
  }
});
