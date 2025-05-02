import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as Animatable from "react-native-animatable";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import { ENDPOINT } from "./api_key/Poe";
import NetworkStatus from "./api_key/network _checker";
import Markdown from "react-native-markdown-display";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const { width, height } = Dimensions.get("window");

const App = () => {
  const [language, setLanguage] = useState("en");
  const [problemType, setProblemType] = useState("");
  const [affectedArea, setAffectedArea] = useState("");
  const [possibleSolution, setPossibleSolution] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [generatedPaper, setGeneratedPaper] = useState("");
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [loadingModalVisible, setLoadingModalVisible] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [scrollPromptVisible, setScrollPromptVisible] = useState(false);
  const [Price, setPrice] = useState();

  const scrollViewRef = useRef(null);

  const languages = [
    { label: "English", value: "en" },
    { label: "French", value: "fr" },
    { label: "Spanish", value: "es" },
    { label: "Portuguese", value: "pt" },
    { label: "Swahili", value: "sw" },
    { label: "Shona", value: "sn" },
    { label: "Ndebele", value: "nd" },
  ];

  const features = [
    {
      icon: "📚",
      title: "Quality Research",
      description: "Professional academic papers with proper structure",
    },
    {
      icon: "💳",
      title: "Secure Payments",
      description: "Safe PayNow/EcoCash integration",
    },
    {
      icon: "🌍",
      title: "Multilingual",
      description: "Multiple language support",
    },
  ];


  useEffect(()=>{
    const getPrice = async() =>{
      
    try {
      const response = await fetch(`${ENDPOINT}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Message: ${errorText}`
        );
      }

      const result = await response.json();
      console.log(result);
      setPrice(result.price);
    } catch (error) {
      console.error("Getting Price failed:", error);
    }
    }

    getPrice();

  }, [])

  const handleOpenModal = () => {
    setShowPaymentModal(true);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const initializePayment = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${ENDPOINT}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Number: paymentReference }),
      });

      console.log(response);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Message: ${errorText}`
        );
      }

      const result = await response.json();

      console.log("Payment request created for:", paymentReference);
      console.log("Payment request response:", result);
      setPaymentStatus("pending");

      // Introduce a delay before verifying payment
      await delay(5000); // Delay for 5 seconds (5000 milliseconds)

      verifyPayment(result.pollUrl);
    } catch (error) {
      console.error("Payment request failed:", error);
    }
  };

  const verifyPayment = async (pollUrl) => {
    setLoading(true);
    const startTime = Date.now(); // Record the start time
    const interval = 15000; // Poll every 15 seconds

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(
          `${ENDPOINT}/check-payment-status?pollUrl=${pollUrl}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("log0", response);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! Status: ${response.status}, Message: ${errorText}`
          );
        }

        const result = await response.json();
        console.log(result);

        // Check for specific statuses
        if (result.status === 200) {
          // Paid
          clearInterval(polling); // Stop polling if payment is verified
          setPaymentStatus("success");
          setPaymentVerified(true);
          setShowPaymentModal(false);
          Alert.alert(
            "Payment Verified",
            `Payment of ${Price} from ${paymentReference} has been verified.`
          );
        } else if (result.status === 202) {
          setLoading(true);
          console.log("Payment is still pending, continuing to poll.");
        } else if (result.status === "sent") {
          setLoading(true);
          console.log("Payment has been sent, awaiting confirmation.");
        } else if (result.status === 400) {
          console.log(
            "Payment verification failed or cancelled:",
            result.message
          );
          clearInterval(polling); // Stop polling on failure
          Alert.alert("Payment Status", result.message);
        }
      } catch (error) {
        clearInterval(polling);
        console.error("Payment verification failed:", error);
      } finally {
        setLoading(false);
      }
    };

    // Set up polling
    const polling = setInterval(() => {
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime >= 120000) {
        // 2 minutes timeout
        clearInterval(polling);
        Alert.alert("Payment Verification", "Payment verification timed out.");
        setLoading(false);
        return;
      }

      pollPaymentStatus(); // Check the payment status
    }, interval);

    pollPaymentStatus();
  };


  const onDownload = async () => {
    const title = "Project";
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const path = `${FileSystem.documentDirectory}${sanitizedTitle}.pdf`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
          h1 { color: #2c5282; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${generatedPaper
          .replace(/#/g, "<h2>")
          .replace(/##/g, "<h3>")
          .replace(/\n/g, "<br>")}
      </body>
      </html>
    `;

    try {
      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Move the PDF to the desired path
      await FileSystem.moveAsync({
        from: uri,
        to: path,
      });

      Alert.alert("Success", "PDF saved successfully!");
      openFile(path); // Open the file after saving
      setShowSessionModal(true);
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to save the PDF.");
    }
  };

  const openFile = async (filePath) => {
    try {
      await Sharing.shareAsync(filePath);
    } catch (error) {
      console.error("Error opening file:", error);
      Alert.alert("Error", "Failed to open the document.");
    }
  };

  
  const generateContent = async (values) => {
    try {
      setButtonDisabled(true);
      const prompt = `
    Write a detailed project body for the following:

    create project title based on ${problemType} affecting people in ${affectedArea}

    mention  ${affectedArea} throughout the paper to make it realistic.

    give statistics about  ${affectedArea} where necessary.
  
    **Chapter 1: Problem Identification**
  
    **1.1 Problem Description**:  create a description based on ${problemType}
  
    **1.2 Statement of Intent**: create 5 bulleted statements ${values.intent}
  
    **1.3 Main Idea (Theme/Topic)**: create a one sentence main idea based on ${problemType}
  
    **1.4 Design Specifications**: create ${values.designSpecifications} and also list tools that might be needed
  
    **Chapter 2: Investigation of Related Ideas**
  
    **2.1 Understanding the Problem**: Discuss the factors related to ${problemType}.
  
    **2.2 Existing Solutions**: Analyze 4 existing solutions, including advantages and disadvantages in paragraphs .
  
    **2.3 Gaps in the Literature**: Identify gaps related to ${problemType}.
  
    **Chapter 3: Generation of Ideas**
  
    **3.1 Modification of Existing Solutions**: Describe how 4 existing solutions will be modified.
  
    **3.2 Creation of New Ideas**: Outline 4 new ideas for ${problemType} programs.
  
    **3.3 Analysis of Possible Ideas**: Evaluate advantages and disadvantages of proposed ideas in 4 paragraphs.
  
    **3.4 Presentation of Possible Solutions**: Explain how solutions will be presented to the community.
  
    **Chapter 4: Development of Idea**
  
    **4.1 Selection of the Best Idea**: Detail the chosen program and its components.
  
    **4.2 Refinement of the Chosen Idea**: Discuss the refinement process and collaboration with experts.
  
    **4.3 Experimentation and Testing**: Explain how the program will be tested and evaluated.
  
    **Chapter 5: Presentation of Results**
  
    **5.1 Final Solution**: Summarize the final solution and its components in 4 paragraphs.
  
    **5.2 Evaluation of the Final Solution**: Describe how the solution's effectiveness will be measured.
  
    **Chapter 6: Evaluation and Recommendations**
  
    **6.1 Achievements and Challenges**: Reflect on what was achieved and the challenges faced.
  
    **6.2 Recommendations for Further Improvement**: Provide recommendations for future initiatives.
  
    **Conclusion**: Summarize the project's contributions to reducing ${problemType}.
    
    write academically in paragraphs keeping all subtitles but showing deep research. quote a minimum of 8 scholars in chapter 2 and write what they said. do not just lit, give clear explanations in good 5 sentntence paragraphs. indicate where diagrams are needed.
  
    Include all references used and ensure the content is well-structured according to the chapter and section format.

  `;

      console.log("before generation");

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST", // Make sure to specify the method
          headers: {
            Authorization: `Bearer sk-ed6fcecba6214a498d3526e2a0d2f489`, // Replace with your actual API key
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: prompt },
            ],
            stream: false,
          }),
        }
      );

      const data = await response.json(); // Parse the response as JSON

      if (!data.choices || data.choices.length === 0) {
        throw new Error("No choices returned in the response.");
      }
      setLoadingModalVisible(false);
      const msg = `${data.choices[0].message.content}`;
      return msg; // Adjust based on the actual response structure
    } catch (error) {
      console.error("Error generating content:", error);
      throw new Error("Failed to generate content.");
    }
  };

  const handleGenerateProject = async () => {
    try {
      setLoadingModalVisible(true);
 
      
      const projectValues = {
        intent: `This project aims to reduce cases of ${problemType}`,
        designSpecifications: `The initiative must meet the values of ${possibleSolution}`,
      };

      const content = await generateContent(projectValues); // Replace with your content generation function
      setPaymentVerified(false);
      setGeneratedPaper(content); // Set the generated paper content here
      setScrollPromptVisible(true); // Show the scroll prompt
      setButtonDisabled(true); // Disable the button after generation
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingModalVisible(false); // Hide loading modal whether successful or on error
    }
  };

  {
    generatedPaper && (
      <Animatable.View animation="fadeIn" style={styles.paperContainer}>
        <Text style={styles.sectionTitle}>Generated Project Paper</Text>
        {/* <WebView
          originWhitelist={["*"]}
          source={{ html: generatedPaper }}
          style={styles.webView}
        /> */}
        <View
          style={{
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "5px",
          }}
        >
          <Markdown>{generatedPaper}</Markdown>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.downloadButton]}
          onPress={() => onDownload()}
        >
          <Text style={styles.buttonText}>Download Paper</Text>
        </TouchableOpacity>
      </Animatable.View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <NetworkStatus />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <LinearGradient colors={["#2c5282", "#4299e1"]} style={styles.header}>
            <Animatable.Text animation="fadeIn" style={styles.logo}>
              CHAPAGU TECHNOLOGIES
            </Animatable.Text>
            <Animatable.Text
              animation="fadeIn"
              delay={200}
              style={styles.title}
            >
              Academic Project Generator
            </Animatable.Text>
          </LinearGradient>

          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <Animatable.View
                key={index}
                animation="zoomIn"
                delay={index * 200}
                style={styles.featureBox}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </Animatable.View>
            ))}
          </View>

          <View style={styles.formContainer}>
            <Text style={{ paddingBottom: 10, paddingLeft: 4, color: "red" }}>
              USE ONLY WHEN YOUR NETWORK IS GOOD OR NORMAL!!!!
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={language}
                onValueChange={setLanguage}
                style={styles.picker}
              >
                {languages.map((lang) => (
                  <Picker.Item
                    key={lang.value}
                    label={lang.label}
                    value={lang.value}
                  />
                ))}
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Type of Problem Faced"
              value={problemType}
              onChangeText={setProblemType}
              multiline
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="Area Affected by the Problem"
              value={affectedArea}
              onChangeText={setAffectedArea}
              multiline
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="Proposed Solution"
              value={possibleSolution}
              onChangeText={setPossibleSolution}
              multiline
              placeholderTextColor="#666"
            />
            <TouchableOpacity
              style={[styles.button, !paymentVerified && styles.buttonPrimary]}
              onPress={
                paymentVerified ? handleGenerateProject : handleOpenModal
              }
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText2}>
                  {paymentVerified
                    ? "Generate Document"
                    : "Generate Solution Document"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {scrollPromptVisible && (
            <Text style={styles.scrollPrompt}>
              Please scroll down to view your generated document.
            </Text>
          )}

          {generatedPaper && (
            
            <Animatable.View animation="fadeIn" style={styles.paperContainer}>
              <Text style={styles.sectionTitle}>Generated Project Paper</Text>
              <View
                style={{
                  padding: 20,
                  backgroundColor: "#f9f9f9",
                  borderRadius: 5,
                }}
              >
                <Markdown>{generatedPaper}</Markdown>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.downloadButton]}
                onPress={() => {
                  onDownload();
                }}
              >
                <Text style={styles.buttonText}>Download Paper</Text>
              </TouchableOpacity>
            </Animatable.View>
          )}

          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Animatable.View animation="zoomIn" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Payment Details</Text>

            <Text style={styles.modalText}>
              Please enter your Ecocash mobile number:
            </Text>
            <TextInput
              style={[styles.input, { borderWidth: 1 }]}
              placeholder="Your Mobile Number"
              value={paymentReference}
              onChangeText={setPaymentReference} // Use this to capture the user's number
              placeholderTextColor="#666"
            />

            <Text style={styles.paymentDetails}>
              Paying Amount: ${Price} for the Document
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={initializePayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Payment Request</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={() => {setShowPaymentModal(false); setLoading(false)}}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>

      {/* Loading Modal */}
      <Modal visible={loadingModalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <Animatable.View
            animation="zoomIn"
            style={{
              width: 300,
              padding: 20,
              backgroundColor: "white",
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={{ marginTop: 20 }}>
              Loading your document, please wait...
            </Text>
            <Text>This may take up to 5 minutes.</Text>
            <Text>Please be connected during this time.</Text>
          </Animatable.View>
        </View>
      </Modal>

      {/* Session Modal */}
      <Modal visible={showSessionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Animatable.View animation="zoomIn" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Session Complete</Text>
            <Text style={styles.modalText}>
              Your document has been generated successfully. Thank you for using
              Chapagu Technologies.
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => {
                setShowSessionModal(false);
                // Reset state
                setProblemType("");
                setAffectedArea("");
                setPossibleSolution("");
                setPaymentVerified(false);
                setGeneratedPaper("");
              }}
            >
              <Text style={styles.buttonText}>Close Session</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f9fc",
  },
  scrollPrompt: { textAlign: 'center', margin: 10, color: 'orange' },
  webView: {
    height: height * 0.5, // Adjust height as needed
    marginBottom: 20,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 15,
    justifyContent: "space-between",
  },
  featureBox: {
    width: (width - 45) / 3,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c5282",
    textAlign: "center",
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  formContainer: {
    padding: 15,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  buttonPrimary: {
    backgroundColor: "#2c5282",
  },
  buttonCancel: {
    backgroundColor: "#e53e3e",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonText2: {
    // backgroundColor: "green",
    color: "green",
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 30,
    borderRadius: 3,
    paddingTop: 1,
    // paddingBottom: ,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c5282",
    textAlign: "center",
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  paymentDetails: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  paperContainer: {
    padding: 15,
  },
  paperSection: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c5282",
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  downloadButton: {
    backgroundColor: "#38a169",
    marginTop: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default App;
