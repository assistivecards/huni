import React from 'react';
import { Text, View, StatusBar, TouchableOpacity, ActivityIndicator, Image, Linking, SafeAreaView } from 'react-native';
import Navigator from './Navigator';
import Switch from './layouts/Switch';
import ProfileSetup from './layouts/ProfileSetup';
import EmailSignIn from './layouts/EmailSignIn';
import Browser from './layouts/Browser';

import Svg, { Path, Line, Circle, Polyline, Rect } from 'react-native-svg';

import * as Font from 'expo-font';
import * as Localization from 'expo-localization';
import * as ScreenOrientation from 'expo-screen-orientation';

import API from './api';

export default class App extends React.Component {
  constructor(props){
    super(props);

    this.state = {
      screen: "loading",
      moreSignin: false,
      activity: false,
      premium: API.premium
    }

    API.event.on("premium", () => {
      console.log("$$$$$", API.premium)
      this.setState({premium: API.premium});
    })

  }

  async componentDidMount(){
    setTimeout(() => {
      if(this.state.screen == "loading"){
        this.setState({screen: "login"});
      }
    }, 5000);
    this.checkIdentifier();
    ScreenOrientation.unlockAsync();

    API.event.on("refresh", (type) => {
      if(type == "signout"){
        this.setState({screen: "login"});
      }
    })
  }

  async checkIdentifier(providedIdentifier){
    let identifier = providedIdentifier;
    if(!identifier){
      identifier = await API.getIdentifier();
    }

    if(identifier != ""){
      let user = await API.signIn(identifier);
      console.log("Already exists: ", user.language);
      if(user.language){
        API.ramLanguage(user.language).then(res => {
          this.setState({screen: "logged"});
        });
      }else{
        API.ramLanguage(Localization.locale.substr(0,2)).then(res => {
          this.setState({screen: "login"});
        });
      }
    }else{
      API.ramLanguage(Localization.locale.substr(0,2), 1).then(res => {
        this.setState({screen: "login"});
      });
    }
  }

  signInWithEmail(){
    this.setState({screen: "email"});
    API.event.on("authIdentifier", (identifier) => {
      this.checkIdentifier(identifier);
      API.setData("identifier", identifier);
    });
  }

  setCurrentProfile(id){
    if(id){
      API.setCurrentProfile(id);
      this.forceUpdate();

    }else{
      API.getCurrentProfile().then(profile => {
        API.setCurrentProfile(profile.id);
        this.forceUpdate();
      })
    }
  }


  signInScreen(){
    return (
      <>
        <SafeAreaView style={{justifyContent: "center", alignItems: "center", flex: 1, backgroundColor: "#63b2b5"}}>
          <View style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", padding: 30, paddingBottom: 0, marginTop: 20}}>
            <Text style={[API.styles.h1, {color: "#fff", marginTop: 0, marginHorizontal: 0, fontSize: 28, textAlign: "center"}]}>{API.t("setup_welcome_title1")}</Text>
            <Text style={[API.styles.h1, {color: "#fff", marginTop: 0, marginHorizontal: 0, fontSize: 42, textAlign: "center", marginBottom: 15}]}>{API.t("setup_welcome_title2")}</Text>
            <Text style={[API.styles.pHome, {marginBottom: 0, marginHorizontal: 0, textAlign: "center"}]}>{API.t("setup_welcome_description")}</Text>
          </View>

          {this.renderSignInButtons()}
          <TouchableOpacity onPress={() => this.setState({screen: "policy"})} style={{marginTop: 15, marginBottom: 30}}>
            <Text style={[API.styles.pHome, {textAlign: "center"}]}>
              By signing in you accept our <Text style={{fontWeight: "600"}}>Terms of Use</Text> and <Text style={{fontWeight: "600"}}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
        {this.state.activity &&
          <View style={{backgroundColor: "rgba(0,0,0,0.3)", width: "100%", height: "100%", position: "absolute", top: 0, left: 0, justifyContent: "center", alignItems: "center"}}>
            <View style={{width: 60, height: 60, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderRadius: 30}}>
              <ActivityIndicator color={"#63b2b5"}/>
            </View>
            <TouchableOpacity style={{marginTop: 30, position: "absolute", bottom: 30}} onPress={() => this.setState({activity: false})}>
              <Text style={{color: "#fff", fontWeight: "bold", fontSize: 18}}>{API.t("alert_cancel")}</Text>
            </TouchableOpacity>
          </View>
        }
      </>
    )
  }

  renderSignInButtons(){
      return(
        <>
          <TouchableOpacity
            style={{ width: 240, height: 46, alignItems: "center", borderRadius: 25, backgroundColor: "#fff",  justifyContent: "center", flexDirection: "row"}}
            onPress={this.signInWithEmail.bind(this)}>
            <Svg height={18} width={18} viewBox="0 0 24 24" style={{marginRight: 5}} strokeWidth="2" stroke="#333" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M0 0h24v24H0z" stroke="none"/>
              <Rect height="14" width="18" rx="2" x="3" y="5"/>
              <Polyline points="3 7 12 13 21 7"/>
            </Svg>
            <Text style={{fontSize: 19, fontWeight: "500"}}>Sign in with Email</Text>
          </TouchableOpacity>
        </>
      );
  }

  renderLoading(type){
    if(type == "premium"){
      setTimeout(() => {
        this.setState({premium: "none"});
      }, 5000);
    }
    return (
      <View style={{flex: 1, backgroundColor: "#63b2b5", justifyContent: "center", alignItems: "center"}}>
        <StatusBar backgroundColor="#63b2b5" barStyle={"light-content"} />
        <View style={{width: 60, height: 60, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderRadius: 30}}>
          <ActivityIndicator color={"#63b2b5"}/>
        </View>
      </View>
    )
  }

  render() {
    let screen = this.state.screen;

    if(screen == "login"){
      return this.signInScreen();
    }else if(screen == "policy"
  ){
      return (<Browser link={"https://dreamoriented.org/privacypolicy/"} back={() => this.setState({screen: "login"})}/>);
    }else if(screen == "email"){
      return (<EmailSignIn back={() => this.setState({screen: "login"})}/>);
    }else if(screen == "logged"){
      if(API.user.active_profile == "noprofile"){
        return (<ProfileSetup done={this.setCurrentProfile.bind(this)}/>);
      }else if(API.user.active_profile == "multiple"){
        return (<Switch onChoose={this.setCurrentProfile.bind(this)}/>);
      }else if(API.user.active_profile){
        if(this.state.premium == "determining"){
          return this.renderLoading("premium");
        }else{
          return (
            <View style={{flex: 1}}>
              <StatusBar backgroundColor="#ffffff" barStyle={"dark-content"} />
              <Navigator/>
            </View>
          );
        }
      }else{
        return (<ProfileSetup done={this.setCurrentProfile.bind(this)}/>);
      }

    }else if(screen == "loading"){
      return this.renderLoading();
    }
  }
}
