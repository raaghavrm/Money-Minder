import React, { useContext, useState, useEffect } from "react";
import {Linking, ScrollView, Text, View, TouchableOpacity, Image, ToastAndroid } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles }  from './styles';
import AppHeader from "../../../components/AppHeader";
import { useLogout } from "../../../hooks/useLogout";
import Button from "../../../components/Button";
import ListItem from "../../../components/ListItem";
import EditableBox from "../../../components/EditableBox";


import { UserProfileContext } from "../../../context/UserProfileContext";
import { getApp } from "firebase/app";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { useIsFocused } from '@react-navigation/native';
import { getAuth, reauthenticateWithCredential, signInWithEmailAndPassword, updateEmail, updatePassword } from "firebase/auth";
import { projectAuth } from "../../../firebase/firebase";
import Input from "../../../components/Input";

import * as ImagePicker from 'expo-image-picker';
import { useUploadProfileImage } from "../../../hooks/useUploadImage";

import { Icon } from '@rneui/themed';
import { ThemeContext } from "../../../context/ThemeContext";
import themeColors from "../../../utils/themeColors";
import { useAuthContext } from "../../../hooks/useAuthContext";
const app = getApp;
const db = getFirestore(app);


// Profile refers to public information, aka Username & Bio
// Settings refers to private information, aka email (And password maybe)

const Settings = ( { navigation } ) => {
    // const auth = getAuth();
    // const user = auth.currentUser;
    // getting user through auth seems to update better.
    // const { user, authIsReady } = useAuthContext();

    const { user } = useAuthContext();

    const { logout, error, isPending } = useLogout();
    
    const [editingPublic, setEditingPublic] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);

    const [userProfile, setUserProfile] = useContext(UserProfileContext);
    const [tempProfile, setTempProfile] = useState({});
    const [tempSettings, setTempSettings] = useState({});
    //console.log(userProfile);

    const isGoogleAccount = userProfile?.googleAccount;

    //Image Picker:
    const [imageURI, setImageURI] = useState(null);
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.2,
        });
        if (result.assets) {
            setImageURI(result.assets[0].uri);
        }
    }

    const uploadImage = async () => {
        const uploadedURL = await useUploadProfileImage(user.uid, imageURI);
        setUserProfile(v => ({...v, ['url']: uploadedURL}));
        
        await setDoc( doc(db, 'users', user.uid), {
            url: uploadedURL,
        }, { merge: true });
        setImageURI(null);
    }

    const isFocused = useIsFocused();
    useEffect(() => {
        if (user) {
            setTempSettings({email: user.email});
            setTempProfile({username: userProfile?.username, bio: userProfile?.bio});
            console.log("Refresh Settings Page")
        }
      },[isFocused]);

    const onBack = () => {
        navigation.goBack();
    }
    const onLogout = async () => {
        logout();     
    }
    const onEditPublicPress = () => {
        setEditingPublic(b => !b);
    }
    const onEditEmailPress = () => {
        setEditingEmail(b => !b);
    }
    const onEditPasswordPress = () => {
        setEditingPassword(b => !b);
    }

    const onSavePublicInformation = async () => {
        try {
            if (!tempProfile?.username) { 
                ToastAndroid.showWithGravity('Please input a username!', ToastAndroid.LONG, ToastAndroid.BOTTOM);
                return;
            }
            if (!tempProfile?.bio) {
                ToastAndroid.showWithGravity('Please input a bio!', ToastAndroid.LONG, ToastAndroid.BOTTOM);
                return;
            } 

            await setDoc( doc(db, 'users', user.uid), {
                username: tempProfile.username,
                bio: tempProfile.bio,
            }, { merge: true });
            
            setUserProfile(v => ( {...v, username: tempProfile.username, bio: tempProfile.bio} ));
            setEditingPublic(false);
            console.log("Updated User Profile");

        } catch (error) {
            console.log('error updating User Profile ', error);
        }
    };

    const onSaveEmail = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!tempSettings?.email) {
            ToastAndroid.showWithGravity('Please input an email!', ToastAndroid.LONG, ToastAndroid.BOTTOM);
            return;
        };
        if (!tempSettings?.password) {
            ToastAndroid.showWithGravity('Please input your password!', ToastAndroid.LONG, ToastAndroid.BOTTOM);
            return;
        };
        await signInWithEmailAndPassword(projectAuth, user.email, tempSettings.password)
            .then((userCredential) => {
                //Supposed to call reauthenticate function with credential but ig no need, just sign in
                updateEmail(auth.currentUser, tempSettings.email).then(() => {
                    setEditingEmail(false);
                    onToast("Email Updated Successfully!");
                    console.log("Email Updated!");
                }).catch((error) => {
                    errorMessage = "Error updating email: " + error;
                    onToast(errorMessage);
                });
            })
            .catch((err) => {
                onToast(String(err));
        });
    };
    
    const onSavePassword = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!tempSettings?.newPassword) {
            ToastAndroid.showWithGravity('Please input a new Password!', ToastAndroid.LONG, ToastAndroid.BOTTOM);
            return;
        };
        if (!tempSettings?.password) {
            ToastAndroid.showWithGravity('Please input your current Password!', ToastAndroid.LONG, ToastAndroid.BOTTOM);
            return;
        };
        await signInWithEmailAndPassword(projectAuth, user.email, tempSettings.password)
            .then((userCredential) => {
                updatePassword(auth.currentUser, tempSettings.newPassword).then(() => {
                    setEditingPassword(false);
                    onToast("Password Updated Successfully!");
                    console.log("Password Updated!");
                }).catch((error) => {
                    console.log("Error updating password", error);
                    errorMessage = "Error updating password: " + error;
                    onToast(errorMessage);
                });
            })
            .catch((err) => {
                errorMessage = "Error Signing in: " + err;
                    onToast(errorMessage);
        });
    };

    const onToast = (errorMessage) => {
        console.log("Toast");
        ToastAndroid.showWithGravity(errorMessage, ToastAndroid.LONG, ToastAndroid.BOTTOM);
    }

    const onChangeTempProfile = (key, value) => {
        setTempProfile(v => ( {...v, [key]: value} ));
    }
    const onChangeTempSettings = (key, value) => {
        setTempSettings(v => ( {...v, [key]: value} ));
    }

    const onFAQ = () => {
        // will link to poster or github readme.
        Linking.openURL('https://github.com/raaghavrm/Money-Minder/blob/main/documentation/FAQ.md');
        //getServices();
    };

    const onContactUs = () => {
        // or link to orbital page idk
        Linking.openURL('mailto:raaghavrm@gmail.com?subject=ContactMoneyMinder');
    };

    const onPrivacy = () => {
        // will link to poster or github readme.
        Linking.openURL('https://github.com/raaghavrm/Money-Minder/blob/main/documentation/PrivacyAndTerms.md');
        //getServices();
    };

    const RickRoll = () => {
        Linking.openURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); 
    }

    const { theme } = useContext(ThemeContext);
    let activeColors = themeColors[theme.mode];

    return (
        <SafeAreaView style={styles.mainContainer}>
            <AppHeader title="Settings" showBack onBack={onBack}/>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Public Information */}
                <View style={styles.sectionHeader}> 
                    <Text style={[styles.sectionTitle, {color: activeColors.text}]}>Edit Public Information</Text>
                    <TouchableOpacity onPress={onEditPublicPress} style={styles.touchable}>
                        <Icon name='edit' style={styles.icon} type='font-awesome' color={activeColors.iconColor}/> 
                    </TouchableOpacity>
                </View>

                {/* Update Profile Picture */}
                <View style={styles.profilePictureContainer}>
                    <TouchableOpacity style={styles.displayTouchable} onPress={pickImage}>
                        { !imageURI ? <Image style={styles.displayPicture} source={{uri: userProfile.url}}/> : null }
                        { imageURI ? <Image style={styles.displayPicture} source={{uri: imageURI}}/> : null }
                        <Image style={styles.editCircle} source={require('../../../assets/icons/editCircle.png')}/>
                    </TouchableOpacity>
                    {imageURI ? ( <Button style={styles.button} onPress={uploadImage} title="Upload Profile Picture"/> ) : null }
                </View>


                {/* Public Information: Username & Bio */}
                <EditableBox label="Username" value={tempProfile.username} onChangeText={(v) => onChangeTempProfile('username', v)} editable={editingPublic} style={styles.EditableBox} />
                <EditableBox label="Bio" value={tempProfile.bio} onChangeText={(v) => onChangeTempProfile('bio', v)} editable={editingPublic} style={styles.EditableBox} multiline />
                {editingPublic ? ( <Button style={styles.button} onPress={onSavePublicInformation} title="Save"/> ) : null }

                {/* Private Information: Email */}
                <View style={styles.sectionHeader}> 
                    <Text style={[styles.sectionTitle, {color: activeColors.text}]}>Update Email Address</Text>
                    <TouchableOpacity onPress={onEditEmailPress} style={styles.touchable}>
                        <Icon name='edit' style={styles.icon} type='font-awesome' color={activeColors.iconColor}/> 
                    </TouchableOpacity>
                </View>
                <EditableBox label="Email" value={tempSettings.email} onChangeText={(v) => onChangeTempSettings('email', v)} editable={editingEmail} style={styles.EditableBox} />
                
                {!isGoogleAccount && editingEmail ? 
                ( <Input value={tempSettings.password} onChangeText={(v) => onChangeTempSettings('password', v)} 
                    labelStyle={{ color: activeColors.inputLabel }} 
                    inputContainerStyle={{ backgroundColor: activeColors.inputBackground, borderColor: activeColors.inputBorder }} 
                    inputStyle={{ color: activeColors.text }}
                    placeholderColor={activeColors.text}
                    label="Current Password" placeholder="*******" isPassword/> ) : null }
                {!isGoogleAccount && editingEmail ? ( <Button style={styles.button} onPress={onSaveEmail} title="Update Email"/> ) : null }
                {isGoogleAccount && editingEmail &&
                    <View style={[styles.infoBox, {backgroundColor: activeColors.editableBoxBackground}]}>
                        <Text style={{color: activeColors.text}}> Google Account Email is fixed. </Text>
                    </View> }

                {/* Private Information: Password */}
                <View style={[styles.sectionHeader, {paddingBottom: 12}]}> 
                    <Text style={[styles.sectionTitle, {color: activeColors.text}]}>Update Password</Text>
                    <TouchableOpacity onPress={onEditPasswordPress} style={styles.touchable}>
                        <Icon name='edit' style={styles.icon} type='font-awesome' color={activeColors.iconColor}/> 
                    </TouchableOpacity>
                </View>
                {!isGoogleAccount && editingPassword ?   
                    (<Input value={tempSettings.newPassword} onChangeText={(v) => onChangeTempSettings('newPassword', v)} 
                    labelStyle={{ color: activeColors.inputLabel }} 
                    inputContainerStyle={{ backgroundColor: activeColors.inputBackground, borderColor: activeColors.inputBorder }} 
                    inputStyle={{ color: activeColors.text }}
                    placeholderColor={activeColors.text}
                    label="New Password" placeholder="*******" isPassword/>) : null }
                {!isGoogleAccount && editingPassword ? 
                    ( <Input value={tempSettings.password} onChangeText={(v) => onChangeTempSettings('password', v)} 
                    labelStyle={{ color: activeColors.inputLabel }} 
                    inputContainerStyle={{ backgroundColor: activeColors.inputBackground, borderColor: activeColors.inputBorder }} 
                    inputStyle={{ color: activeColors.text }}
                    placeholderColor={activeColors.text}
                    label="Current Password" placeholder="*******" isPassword/> ) : null }
                {!isGoogleAccount && editingPassword ? ( <Button style={styles.button} onPress={onSavePassword} title="Update Password"/> ) : null }
                {isGoogleAccount && editingPassword &&
                    <View style={[styles.infoBox, {backgroundColor: activeColors.editableBoxBackground}]}>
                        <Text style={{color: activeColors.text}}> Update password through your Google Account. </Text>
                    </View> }


                {/* Help Centre */}
                <Text style={[styles.sectionTitle, {color: activeColors.text}]}>Help Center</Text>
                <ListItem onPress={onFAQ} style={styles.item} title="FAQ"/>
                <ListItem onPress={onContactUs} style={styles.item} title="Contact us"/>
                <ListItem onPress={onPrivacy} style={styles.item} title="Privacy & Terms"/>

                {!isPending && <Button onPress={onLogout} style={styles.logoutButton} title="Log out"  />}
                {isPending && <Button onPress={onLogout} style={styles.logoutButton} disabled={true} title="loading"  />}
                { error && <p>{ error }</p> }
            
            </ScrollView>
        </SafeAreaView>
    )
}

export default React.memo(Settings);