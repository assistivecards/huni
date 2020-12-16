import React from 'react';
import { StyleSheet, Platform, Text, View, TouchableOpacity, StatusBar, Dimensions, Image, TextInput, TouchableHighlight } from 'react-native';
import { Image as CachedImage } from "react-native-expo-image-cache";

import API from '../api'
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

  recognize(word){
    this.wordToRecognize = word;
    this._startRecognizing();
  }

  async recognized(){
    await this._stopRecognizing();

    let cardIndex = this.state.cardIndex;
    this.setState({
      cardIndex: cardIndex+1
    });
    this.wordToRecognize = "$|$";

    if(this.cards[cardIndex+1]){
      this.recognize(this.cards[cardIndex+1].title);
    }else{
      alert("All done!");
    }
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

      {typeof this.cards[this.state.cardIndex] != "undefined" &&
        <Text style={API.styles.p}>{this.cards[this.state.cardIndex].title}</Text>
      }

      {typeof this.cards[this.state.cardIndex+1] != "undefined" &&
        <Text>Next: {this.cards[this.state.cardIndex+1].title}</Text>
      }


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
