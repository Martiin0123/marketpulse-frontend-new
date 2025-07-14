import { NextRequest, NextResponse } from 'next/server';

// Google Gemini API key
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

console.log('GOOGLE_AI_API_KEY', GOOGLE_AI_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, userIntent } = await request.json();

    // Try Google Gemini first
    let aiResponse = null;
    let error = null;

    if (GOOGLE_AI_API_KEY) {
      try {
        aiResponse = await tryGemini(message, conversationHistory, userIntent);
        console.log('✅ Using Google Gemini response');
      } catch (geminiError) {
        console.log('❌ Google Gemini failed, using fallback...');
        error = geminiError;
      }
    }

    // Use fallback responses if Gemini failed or not available
    if (!aiResponse) {
      console.log('🔄 Using fallback responses');
      return getFallbackResponse(message);
    }

    // If we have an AI response, process it
    if (aiResponse) {
      // Analyze response for intent and discount opportunity
      const shouldOfferDiscount = analyzeForDiscountOpportunity(message, aiResponse, conversationHistory?.length || 0);
      const detectedIntent = analyzeIntent(message, aiResponse);

      return NextResponse.json({
        response: aiResponse,
        intent: detectedIntent,
        shouldOfferDiscount,
        discountMessage: shouldOfferDiscount ? {
          type: 'discount',
          message: "🎉 SPECIAL OFFER: Use code EARLY20 for 20% off your first month! Limited to first 10 users only.",
          code: 'EARLY20'
        } : null
      });
    }

    // If we get here, something went wrong
    throw new Error('No AI response available');

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Fallback response
    return NextResponse.json({
      response: "I'm having trouble connecting right now, but I can still help! What would you like to know about PrimeScope's AI trading signals?",
      intent: 'browsing',
      shouldOfferDiscount: false
    });
  }
}

function analyzeForDiscountOpportunity(userMessage: string, aiResponse: string, conversationLength: number): boolean {
  const userInput = userMessage.toLowerCase();
  const response = aiResponse.toLowerCase();
  
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

// Helper function to try Google Gemini
async function tryGemini(message: string, conversationHistory: any[], userIntent: string): Promise<string> {
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
  
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('No Google AI API key available');
  }

  const systemPrompt = `You are an AI sales assistant for PrimeScope, an AI-powered trading signals platform. Your goal is to help users understand our services and convert them to customers.

Key Information:
- We offer 3 plans: Free (Discord access only, signals but very rarely) and Premium (offers all signals) and VIP (includes bybit copy trading whitelist access)
- Free plan: Access to Discord community only
- Premium/VIP plans: Full AI trading signals, priority support, advanced analytics
- Premium: €99/month or €999/year
- VIP: €299/month or €2599/year
- Discount code EARLY20 for 20% off first month of Premium/VIP
- AI trading signals with high win rates
- Monthly no-loss guarantee (full refund if the month is net negative)
- Discord community access (free for everyone)
- Referral program: €19 per successful referral
- Early-stage startup with authentic numbers
- created by real real trader after studying the markets and charts for years

Sales Approach:
- Be helpful and informative first
- Address objections gently
- Highlight value and benefits
- if necessary use branch-standard numbers for winrate and other metrics
- you can use emojis sparingly but effectively
- Offer discount codes strategically
- Be authentic and not pushy
- Always mention Discord invite for free plan (https://discord.gg/GDY4ZcXzes)
- Direct Premium/VIP users to Stripe checkout

Response Format:
- Keep responses SHORT and concise (max 2-3 sentences)
- Be direct and to the point, and act as a master of sales - however not pushy
- Include Discord link for free plan (https://discord.gg/GDY4ZcXzes) (not in every message)
- Mention pricing but not in every message
- No long explanations
- dont use [link to page], instead return a clickable link with e.g. primescope.app/pricing or primescope.app/signin/signup 

Current Context:
- User Intent: ${userIntent || 'browsing'}
- Conversation Length: ${conversationHistory?.length || 0} messages
- Should offer discount: no`;

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
  
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
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
          maxOutputTokens: 150,
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

    console.log('📡 Google Gemini response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Gemini API error:', response.status, errorText);
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
    }
  } catch (fetchError) {
    console.error('❌ Google Gemini fetch error:', fetchError);
    throw fetchError;
  }

  const data = await response.json();
  const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!aiResponse) {
    throw new Error('No response content from Google Gemini');
  }

  return aiResponse;
}

// Helper function for fallback responses
function getFallbackResponse(userMessage: string) {
  const input = userMessage.toLowerCase();
  let intent: 'browsing' | 'interested' | 'ready' | 'objection' = 'browsing';
  let shouldOfferDiscount = false;

  // Sales-focused responses with intent detection
  if (input.includes('price') || input.includes('cost') || input.includes('subscription') || input.includes('how much')) {
    intent = 'interested';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: 'Free: Discord access. Premium: €99/month. VIP: €299/month. Which interests you?',
      intent,
      shouldOfferDiscount,
      discountMessage: {
        type: 'discount',
        message: "🎉 SPECIAL OFFER: Use code EARLY20 for 20% off your first month! Limited to first 10 users only.",
        code: 'EARLY20'
      }
    });
  }

  if (input.includes('signal') || input.includes('trade') || input.includes('win rate') || input.includes('performance')) {
    intent = 'interested';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: 'AI signals with high win rates. Real-time delivery via Discord. Want to see performance data?',
      intent,
      shouldOfferDiscount,
      discountMessage: {
        type: 'discount',
        message: "🎉 SPECIAL OFFER: Use code EARLY20 for 20% off your first month! Limited to first 10 users only.",
        code: 'EARLY20'
      }
    });
  }

  if (input.includes('guarantee') || input.includes('refund') || input.includes('money back') || input.includes('risk')) {
    intent = 'interested';
    return NextResponse.json({
      response: "Monthly no-loss guarantee. Full refund if we lose money. No questions asked.",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('discord') || input.includes('community') || input.includes('group')) {
    intent = 'interested';
    return NextResponse.json({
      response: "Free Discord community: https://discord.gg/GDY4ZcXzes - Learn from traders, earn €19 per referral!",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('referral') || input.includes('earn') || input.includes('reward') || input.includes('money')) {
    intent = 'interested';
    return NextResponse.json({
      response: 'Earn €19 per referral. Many users earn more than subscription costs!',
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('start') || input.includes('sign up') || input.includes('register') || input.includes('join')) {
    intent = 'ready';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "Join Discord free: https://discord.gg/GDY4ZcXzes. Premium €99/month or VIP €299/month?",
      intent,
      shouldOfferDiscount,
      discountMessage: {
        type: 'discount',
        message: "🎉 SPECIAL OFFER: Use code EARLY20 for 20% off your first month! Limited to first 10 users only.",
        code: 'EARLY20'
      }
    });
  }

  if (input.includes('expensive') || input.includes('too much') || input.includes('costly') || input.includes('cheap')) {
    intent = 'objection';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "Less than coffee per day. No-loss guarantee. Try free Discord first: https://discord.gg/GDY4ZcXzes",
      intent,
      shouldOfferDiscount,
      discountMessage: {
        type: 'discount',
        message: "🎉 SPECIAL OFFER: Use code EARLY20 for 20% off your first month! Limited to first 10 users only.",
        code: 'EARLY20'
      }
    });
  }

  if (input.includes('scam') || input.includes('fake') || input.includes('trust') || input.includes('real')) {
    intent = 'objection';
    return NextResponse.json({
      response: "Legitimate company. No-loss guarantee. Join free Discord to see: https://discord.gg/GDY4ZcXzes",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('help') || input.includes('support') || input.includes('contact')) {
    return NextResponse.json({
      response: "Ask about pricing, features, or getting started. Support via Discord or email.",
      intent,
      shouldOfferDiscount
    });
  }

  if (input.includes('yes') || input.includes('okay') || input.includes('sure') || input.includes('interested')) {
    intent = 'ready';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "Great! Join Discord free: https://discord.gg/GDY4ZcXzes. Premium €99 or VIP €299?",
      intent,
      shouldOfferDiscount,
      discountMessage: {
        type: 'discount',
        message: "🎉 SPECIAL OFFER: Use code EARLY20 for 20% off your first month! Limited to first 10 users only.",
        code: 'EARLY20'
      }
    });
  }

  if (input.includes('no') || input.includes('not interested') || input.includes('maybe later')) {
    intent = 'objection';
    shouldOfferDiscount = true;
    return NextResponse.json({
      response: "What's holding you back? Price, timing, or something else?",
      intent,
      shouldOfferDiscount,
      discountMessage: {
        type: 'discount',
        message: "🎉 SPECIAL OFFER: Use code EARLY20 for 20% off your first month! Limited to first 10 users only.",
        code: 'EARLY20'
      }
    });
  }

  // Default response with gentle sales approach
  return NextResponse.json({
    response: "AI trading signals, pricing, features? Join free Discord: https://discord.gg/GDY4ZcXzes. What interests you?",
    intent,
    shouldOfferDiscount
  });
} 