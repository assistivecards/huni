import React from 'react';
import { StyleSheet, Platform, Text, View, TouchableOpacity, StatusBar, Dimensions, Image, TextInput, Animated } from 'react-native';
import { Image as CachedImage } from "react-native-expo-image-cache";

import API from '../api'
import TouchableScale from 'touchable-scale-btk'

export default class App extends React.Component {

  state = {
    colorAnim: new Animated.Value(this.props.active ? 1 : 0)
  }

  speak(text, speed){
    API.haptics("touch");
    API.speak(text, speed);
  }

  UNSAFE_componentWillReceiveProps(newProps){
    if(newProps.active != this.props.active){
      Animated.timing(
        this.state.colorAnim,
        {
          toValue: newProps.active ? 1 : 0,
          duration: 200,
          useNativeDriver: false
        }
      ).start();
    }
  }

  render(){
    var color = this.state.colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#F7F7F7', '#92c9cc']
    });

    let result = this.props.result;
    return (
      <View style={{width: this.props.width}}>
        <Animated.View style={[styles.item, {flexDirection: API.user.isRTL ? "row-reverse" : "row", backgroundColor: result.type == 1 ? result.color : "#F7F7F7", borderWidth: 2, borderColor: color}]}>
          <CachedImage uri={`${API.assetEndpoint}cards/${result.pack}/${result.slug}.png?v=${API.version}`} style={{width: API.isTablet ? 70 : 50, height: API.isTablet ? 70 : 50, margin: 5}}/>
          <Text style={[styles.searchItemText, {fontSize: result.type == 2 ? 16 : 19, marginLeft: result.type == 2 ? 0 : 10}]}>{result.title}</Text>
        </Animated.View>
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
