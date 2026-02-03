import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Icon} from 'react-native-paper';
import {RootStackParamList} from '@types';
import {SPACING} from '@constants/theme';
import {authService} from '@services/authService';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const DARK_BG = '#0D0D1A';
const CARD_BG = '#1A1A2E';
const PURPLE = '#6C63FF';
const PINK = '#FF6B9D';

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.login(email, password);

      if (response.success) {
        navigation.replace('Main');
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      console.log('Login Error:', JSON.stringify(err, null, 2));
      console.log('Error Response:', err.response);
      console.log('Error Message:', err.message);

      let errorMessage = 'Network error. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Icon source="cart" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.subtitle}>Welcome Back To</Text>
              <Text style={styles.title}>ShopSync</Text>
              <Text style={styles.description}>
                Sign in to manage your shop
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <View style={styles.form}>
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Username</Text>
                  <View style={styles.inputContainer}>
                    <Icon source="account" size={20} color={PURPLE} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter username"
                      placeholderTextColor="#5A5A7A"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Icon source="lock" size={20} color={PURPLE} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter password"
                      placeholderTextColor="#5A5A7A"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}>
                      <Icon
                        source={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#8B8BA7"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error Message */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Sign In Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading || !email || !password}
                  activeOpacity={0.8}
                  style={[
                    styles.signInButton,
                    (!email || !password || isLoading) &&
                      styles.signInButtonDisabled,
                  ]}>
                  {isLoading ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.buttonText}>Signing in...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <Text style={styles.footer}>Powered by Phantom Card Vault</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#8B8BA7',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: '#5A5A7A',
    marginTop: SPACING.xs,
  },
  card: {
    flex: 0.6,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  form: {
    gap: SPACING.md,
  },
  inputWrapper: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  signInButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: PURPLE,
  },
  signInButtonDisabled: {
    backgroundColor: '#3A3A5A',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: PINK,
    fontSize: 13,
    textAlign: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#5A5A7A',
    fontSize: 12,
    marginTop: 'auto',
    paddingBottom: SPACING.xl,
  },
});

export default LoginScreen;
