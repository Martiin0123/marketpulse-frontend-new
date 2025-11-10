import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

export async function POST(request: NextRequest) {
  let userMessage = '';
  try {
    const { message, conversationHistory, userIntent } = await request.json();
    userMessage = message; // Extract for fallback use

    if (!GOOGLE_AI_API_KEY) {
      console.log('❌ No Google AI API key found, using fallback');
      return getFallbackResponse(userMessage);
    }

    // Build conversation context
    const systemPrompt = `You are an AI sales assistant for PrimeScope, an AI-powered trading signals platform. Your goal is to help users understand our services and convert them to customers.

Key Information:
- We offer 2 plans: Free (Discord access only) and Premium/VIP (with Stripe payments)
- Free plan: Access to Discord community only
- Premium/VIP plans: Full AI trading signals, priority support, advanced analytics
- Premium: €99/month or €999/year
- VIP: €299/month or €2599/year
- Discount code EARLY20 for 20% off first month of Premium/VIP
- AI trading signals with high win rates
- Monthly no-loss guarantee (full refund if loss)
- Discord community access (free for everyone)
- Referral program: €19 per successful referral
- Early-stage startup with authentic numbers

Sales Approach:
- Be helpful and informative first
- Address objections gently
- Highlight value and benefits
- Use social proof when relevant
- Offer discount codes strategically
- Be authentic and not pushy
- Always mention Discord invite for free plan
- Direct Premium/VIP users to Stripe checkout

Response Format:
- Keep responses conversational and engaging
- Ask follow-up questions to understand needs
- Provide specific, actionable information
- Use emojis sparingly but effectively
- For free plan: Always include Discord invite link
- For paid plans: Direct to Stripe checkout

Current Context:
- User Intent: ${userIntent || 'browsing'}
- Conversation Length: ${conversationHistory?.length || 0} messages
- Should offer discount: ${conversationHistory?.length > 3 ? 'yes' : 'no'}`;

    // Build conversation history for Gemini
    const conversationText = conversationHistory
      .map((msg: any) => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

Conversation History:
${conversationText}

User: ${message}

Assistant:`;

    console.log('🔍 Making Google Gemini API request...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 300,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    console.log('📡 Gemini API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', errorText);
      
      // Fallback to predefined responses
      return getFallbackResponse(message);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error('❌ No response content from Gemini');
      return getFallbackResponse(message);
    }

    // Analyze response for intent and discount opportunity
    const shouldOfferDiscount = analyzeForDiscountOpportunity(message, aiResponse, conversationHistory?.length || 0);
    const detectedIntent = analyzeIntent(message, aiResponse);

    return NextResponse.json({
      response: aiResponse,
      intent: detectedIntent,
      shouldOfferDiscount
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Fallback response - use empty string if userMessage not set
    return getFallbackResponse(userMessage || 'Hello');
  }
}

function getFallbackResponse(userMessage: string) {
  const input = userMessage.toLowerCase();
  let intent: 'browsing' | 'interested' | 'ready' | 'objection' = 'browsing';
  let shouldOfferDiscount = false;

  // Sales-focused responses with intent detection
  if (input.includes('price') || input.includes('cost') || input.includes('subscription') || input.includes('how much')) {
    intent = 'interested';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: 'PrimeScope offers three tiers: Free (limited), Premium (€99/month), and VIP (€299/month). Premium and VIP include our AI trading signals, priority support, and advanced analytics. The VIP tier also includes exclusive signals and 1-on-1 consultations. Which tier interests you most?',
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('signal') || input.includes('trade') || input.includes('win rate') || input.includes('performance')) {
    intent = 'interested';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: 'Our AI trading signals have achieved impressive results! We use advanced algorithms analyzing market conditions 24/7. Our signals are delivered in real-time via Discord, email, and dashboard. Many traders see significant improvements in their trading performance. Would you like to see our latest performance data?',
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('guarantee') || input.includes('refund') || input.includes('money back') || input.includes('risk')) {
    intent = 'interested';
    return NextResponse.json({
      response: "Absolutely! We offer a monthly no-loss guarantee - if our signals result in a net loss for any month, you get a full refund. No questions asked. This shows our confidence in our system. It's like having insurance on your trading!",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('discord') || input.includes('community') || input.includes('group')) {
    intent = 'interested';
    return NextResponse.json({
      response: "Our Discord community is amazing! You get access to fellow traders, real-time discussions, strategy sharing, and our support team. It's free to join and you'll learn so much. Plus, you can earn €19 for every referral!",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('referral') || input.includes('earn') || input.includes('reward') || input.includes('money')) {
    intent = 'interested';
    return NextResponse.json({
      response: 'Our referral program is fantastic! Earn €19 for every successful referral who subscribes to any premium plan. You get your unique link from the dashboard. Many users earn more from referrals than their subscription costs!',
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('start') || input.includes('sign up') || input.includes('register') || input.includes('join')) {
    intent = 'ready';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "Perfect! Let's get you started. You can sign up for free and join our Discord community immediately. For full access to our AI signals, you'll want Premium or VIP. I can help you choose the right plan for your trading goals!",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('expensive') || input.includes('too much') || input.includes('costly') || input.includes('cheap')) {
    intent = 'objection';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "I understand cost is important! Consider this: our Premium plan costs less than a coffee per day, and many users earn that back in their first week of trading. Plus, with our no-loss guarantee, you literally can't lose money. The real question is: can you afford NOT to try it?",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('scam') || input.includes('fake') || input.includes('trust') || input.includes('real')) {
    intent = 'objection';
    return NextResponse.json({
      response: "I completely understand your concern! We're a legitimate company with real users and transparent results. We offer a no-loss guarantee, have a thriving Discord community, and many users share their success stories. Plus, you can start free and see for yourself!",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('help') || input.includes('support') || input.includes('contact')) {
    return NextResponse.json({
      response: "I'm here to help with anything! You can ask about our services, pricing, features, or how to get started. For technical support, reach us through Discord or email. What specific question do you have?",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('yes') || input.includes('okay') || input.includes('sure') || input.includes('interested')) {
    intent = 'ready';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "Excellent! I'm excited to help you get started. Would you like to see our pricing plans, or do you have any specific questions about the features? I can also show you how to sign up right now!",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('no') || input.includes('not interested') || input.includes('maybe later')) {
    intent = 'objection';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "No worries! But before you go, what's holding you back? Is it the price, timing, or something else? I'd love to address any concerns you might have.",
      intent,
      shouldOfferDiscount
    });
  }

  // Default response with gentle sales approach
  return NextResponse.json({
    response: "That's a great question! I can help you with our AI trading signals, pricing, features, or how to get started. What aspect of PrimeScope interests you most? I'm here to make sure you have all the information you need!",
    intent,
    shouldOfferDiscount
  });
}

function analyzeForDiscountOpportunity(userMessage: string, aiResponse: string, conversationLength: number): boolean {
  const userInput = userMessage.toLowerCase();
  
  // Offer discount if:
  // 1. User shows interest in pricing/features
  // 2. Conversation is meaningful (3+ messages)
  // 3. User hasn't received discount yet
  const pricingKeywords = ['price', 'cost', 'subscription', 'how much', 'expensive', 'cheap'];
  const interestKeywords = ['interested', 'yes', 'okay', 'sure', 'start', 'sign up'];
  const objectionKeywords = ['no', 'not interested', 'maybe later', 'expensive', 'too much'];
  
  const hasPricingInterest = pricingKeywords.some(keyword => userInput.includes(keyword));
  const showsInterest = interestKeywords.some(keyword => userInput.includes(keyword));
  const hasObjection = objectionKeywords.some(keyword => userInput.includes(keyword));
  
  return (hasPricingInterest || showsInterest || hasObjection) && conversationLength >= 3;
}

function analyzeIntent(userMessage: string, aiResponse: string): 'browsing' | 'interested' | 'ready' | 'objection' {
  const input = userMessage.toLowerCase();
  
  if (input.includes('price') || input.includes('cost') || input.includes('subscription') || input.includes('how much')) {
    return 'interested';
  }
  
  if (input.includes('start') || input.includes('sign up') || input.includes('register') || input.includes('join')) {
    return 'ready';
  }
  
  if (input.includes('expensive') || input.includes('too much') || input.includes('no') || input.includes('not interested')) {
    return 'objection';
  }
  
  if (input.includes('yes') || input.includes('okay') || input.includes('sure') || input.includes('interested')) {
    return 'ready';
  }
  
  return 'browsing';
} 