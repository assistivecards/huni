import React from 'react';
import { StyleSheet, Platform, Text, View, TouchableOpacity, StatusBar, Dimensions, Image, TextInput, TouchableHighlight, Animated, Easing, SafeAreaView } from 'react-native';
import { Image as CachedImage } from "react-native-expo-image-cache";
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import API from '../api'
import WordItem from './WordItem'
import Recognition from './Recognition'

import TouchableScale from 'touchable-scale-btk'
import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-community/voice';

let cardHeight = API.isTablet ? 124 : 94;

export default class App extends React.Component {
  constructor(props: Props) {
    super(props);
    this.state = {
      move: new Animated.Value(0),
      cardIndex: 0,
      results: [],
    };

    Voice.onSpeechResults = this.onSpeechResults;

    this.cards = this.props.cards.map(card => {
      return {
        pack: card.pack,
        title: card.title,
        slug: card.slug
      }
    });
  }

  componentDidMount(){

    setTimeout(async () => {
      await this.recognize(this.cards[this.state.cardIndex].title);
    }, 1000);
  }

  async recognize(word){
    this.wordToRecognize = word;
    await this._startRecognizing();
  }

  async recognized(){
    await this._stopRecognizing();
    API.haptics("impact");
    this.wordToRecognize = "$|$";

    let cardIndex = this.state.cardIndex;

    if(this.cards[cardIndex+1]){
      await this.recognize(this.cards[cardIndex+1].title);
    }else{
      alert("All done!");
    }

    Animated.timing(
      this.state.move,
      {
        toValue: 1,
        duration: 250,
        useNativeDriver: false
      }
    ).start(() => {
      this.state.move.setValue(0);
      this.setState({
        cardIndex: cardIndex+1
      });
    });
  }

  skip(){
    this.recognized();
  }

  componentWillUnmount() {
    Voice.destroy().then(Voice.removeAllListeners);
  }

  onSpeechResults = async (e) => {
    this.setState({
      results: e.value,
    });
    if(e.value[0].toLowerCase().includes(this.wordToRecognize.toLowerCase())){
      this.recognized();
    }
  };

  _startRecognizing = async () => {
    try {
      this.setState({ results: [], started: true });
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
    }
  };

  _stopRecognizing = async () => {
    try {
      await Voice.cancel();
      this.setState({results: [], started: false});
    } catch (e) {
      console.error(e);
    }
  };


  speak(text, speed){
    API.haptics("touch");
    API.speak(text, speed);
  }

  async listenCurrentWord(){
    await this._stopRecognizing();
    this.speak(this.cards[this.state.cardIndex].title);
    setTimeout(async () => {
      await this._startRecognizing();
    }, 1000);
  }

  _getMoveInt = (from, to) => {
    const { move } = this.state;

    return move.interpolate({
      inputRange: [0, 1],
      outputRange: [from, to]
    });
  }

  render(){
    return (
      <SafeAreaView>
        <Recognition active={this.state.started}/>
        <View style={{overflow: "hidden", height: 320}}>
          <LinearGradient
            // Background Linear Gradient
            colors={['rgba(255,255,255,1)','rgba(255,255,255,1)','rgba(255,255,255,0)']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 60,
              zIndex: 99,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center"
            }}
          />

          <Animated.View style={{transform: [{translateY: this._getMoveInt(-cardHeight*(this.state.cardIndex)+50, -cardHeight*(this.state.cardIndex+1)+50)}]}}>
            {this.cards.map((card, i) => {
              return <WordItem result={card} key={i} active={this.state.cardIndex == i} listen={this.listenCurrentWord.bind(this)}/>
            })}
          </Animated.View>
          <LinearGradient
            // Background Linear Gradient
            colors={['rgba(255,255,255,0)','rgba(255,255,255,1)']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 100,
              zIndex: 99,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center"
            }}
          />
        </View>

        <View style={{backgroundColor: "#f5f5f5", padding: 10, justifyContent: "center", alignItems: "center", paddingVertical: 20}}>
          <Text style={[API.styles.p, { fontWeight: "bold", textAlign: "center", marginBottom: 20}]}>{API.t("training_tip")}</Text>

          <TouchableScale style={[API.styles.button, {flexDirection: "row"}]} onPress={() => this.skip()}>
            <Svg className="icon icon-tabler icon-tabler-caret-right" height="30" width="30" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
              <Path d="M0 0h24v24H0z" stroke="none"/>
              <Path d="M15 13l4 -4l-4 -4m4 4h-11a4 4 0 0 0 0 8h1"/>
            </Svg>
            <Text style={{color: "#fff", fontWeight: "bold", fontSize: 18}}>{API.t("training_button_skip")}</Text>
          </TouchableScale>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  item: {
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 25,
    padding: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  searchItemText:{
    fontSize: 16,
    fontWeight: "bold",
    color: "rgba(0,0,0,0.75)",
    flex: 1,
    paddingRight: 10
  },
  searchItemEmoji: {
    fontSize: 25, margin: 10
  }
});
