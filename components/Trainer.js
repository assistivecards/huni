import React from 'react';
import { StyleSheet, Platform, Text, View, TouchableOpacity, StatusBar, Dimensions, Image, TextInput, TouchableHighlight, Animated, Easing } from 'react-native';
import { Image as CachedImage } from "react-native-expo-image-cache";
import { LinearGradient } from 'expo-linear-gradient';

import API from '../api'
import WordItem from './WordItem'

import TouchableScale from 'touchable-scale-btk'
import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-community/voice';

export default class App extends React.Component {
  constructor(props: Props) {
    super(props);
    this.state = {
      move: new Animated.Value(0),
      cardIndex: 0,
      results: [],
    };
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechRecognized = this.onSpeechRecognized;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechError = this.onSpeechError;
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

    setTimeout(() => {
      this.recognize(this.cards[this.state.cardIndex].title);
    }, 1000);
  }

  recognize(word){
    this.wordToRecognize = word;
    this._startRecognizing();
  }

  async recognized(){
    await this._stopRecognizing();
    API.haptics("impact");
    this.wordToRecognize = "$|$";

    let cardIndex = this.state.cardIndex;

    if(this.cards[cardIndex+1]){
      this.recognize(this.cards[cardIndex+1].title);

    }else{
      alert("All done!");
    }

    Animated.timing(
      this.state.move,
      {
        toValue: 1,
        duration: 300,
        useNativeDriver: false
      }
    ).start(async () => {
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
    this.setState({
      started: true,
      results: [],
    });

    try {
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

  _getMoveInt = (from, to) => {
    const { move } = this.state;

    return move.interpolate({
        inputRange: [0, 1],
        outputRange: [from, to],
        extrapolate: 'clamp',
        useNativeDriver: false
    });
  }

  render(){
    return (
      <View>
      <Text style={styles.welcome}>Welcome to Huni!</Text>
      <Text style={styles.instructions}>
        Press the button and start speaking. {this.state.started ? "..." : "?"}
      </Text>
      <Text style={styles.stat}>{`Recognized: ${
        this.state.recognized
      }`}</Text>

      <View style={{overflow: "hidden", height: 250}}>
        <LinearGradient
          // Background Linear Gradient
          colors={['rgba(255,255,255,1)','rgba(255,255,255,0)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 50,
            zIndex: 99,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center"
          }}
        />

        <Animated.View style={{transform: [{translateY: this._getMoveInt(-90*(this.state.cardIndex)+50, -90*(this.state.cardIndex+1)+50)}]}}>
          {this.cards.map((card, i) => {
            return <WordItem result={card} key={i}/>
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

      <View>
        <Text style={API.styles.p}>TIP: Try using the word in a sentence to make it easier to recognize.</Text>
      </View>

      <Text style={styles.stat}>Results</Text>
      {this.state.results.map((result, index) => {
        return (
          <Text key={`result-${index}`} style={styles.stat}>
            {result}
          </Text>
        );
      })}

      <TouchableHighlight onPress={this._startRecognizing}>
        <Text style={styles.action}>Start Recognizing</Text>
      </TouchableHighlight>
      <TouchableHighlight onPress={this._stopRecognizing}>
        <Text style={styles.action}>Stop Recognizing</Text>
      </TouchableHighlight>
      <TouchableHighlight onPress={this._cancelRecognizing}>
        <Text style={styles.action}>Cancel</Text>
      </TouchableHighlight>
      <TouchableHighlight onPress={this._destroyRecognizer}>
        <Text style={styles.action}>Destroy</Text>
      </TouchableHighlight>

      <TouchableHighlight onPress={() => this.skip()}>
        <Text style={API.styles.p}>SKIP</Text>
      </TouchableHighlight>
      </View>
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
