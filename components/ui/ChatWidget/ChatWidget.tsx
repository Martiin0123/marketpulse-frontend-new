'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'discount' | 'cta';
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI trading assistant. I can help you with questions about PrimeScope, trading strategies, or our services. What would you like to know?",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStartTime] = useState(new Date());
  const [userEngagement, setUserEngagement] = useState(0);
  const [hasReceivedDiscount, setHasReceivedDiscount] = useState(false);
  const [userIntent, setUserIntent] = useState<
    'browsing' | 'interested' | 'ready' | 'objection'
  >('browsing');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Track engagement
    setUserEngagement((prev) => prev + 1);

    try {
      // Call AI API for intelligent response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          conversationHistory: messages.filter(
            (msg) => msg.sender === 'user' || msg.sender === 'bot'
          ),
          userIntent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const {
        response: aiResponse,
        intent,
        shouldOfferDiscount
      } = await response.json();

      // Update user intent
      if (intent) {
        setUserIntent(intent);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages((prev) => [...prev, botMessage]);

      // Check if we should offer a discount
      if (shouldOfferDiscount && !hasReceivedDiscount) {
        const conversationDuration =
          Date.now() - conversationStartTime.getTime();
        const shouldShowDiscount =
          conversationDuration > 60000 && userEngagement > 3; // 1 minute + 3+ messages

        if (shouldShowDiscount) {
          setTimeout(() => {
            offerDiscount();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error generating response:', error);

      // Use fallback response when AI fails
      const fallback = getFallbackResponse(inputValue);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallback.response,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages((prev) => [...prev, errorMessage]);

      // Update intent and check for discount
      if (fallback.intent) {
        setUserIntent(fallback.intent);
      }

      if (fallback.shouldOfferDiscount && !hasReceivedDiscount) {
        const conversationDuration =
          Date.now() - conversationStartTime.getTime();
        const shouldShowDiscount =
          conversationDuration > 60000 && userEngagement > 3;

        if (shouldShowDiscount) {
          setTimeout(() => {
            offerDiscount();
          }, 2000);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeUserInput = async (
    userInput: string
  ): Promise<{
    response: string;
    intent?: 'browsing' | 'interested' | 'ready' | 'objection';
    shouldOfferDiscount: boolean;
  }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const input = userInput.toLowerCase();
    let intent: 'browsing' | 'interested' | 'ready' | 'objection' = 'browsing';
    let shouldOfferDiscount = false;

    // Sales-focused responses with intent detection
    if (
      input.includes('price') ||
      input.includes('cost') ||
      input.includes('subscription') ||
      input.includes('how much')
    ) {
      intent = 'interested';
      shouldOfferDiscount = true;
      return {
        response:
          'PrimeScope offers three tiers: Free (limited), Premium ($29/month), and VIP ($99/month). Premium and VIP include our AI trading signals, priority support, and advanced analytics. The VIP tier also includes exclusive signals and 1-on-1 consultations. Which tier interests you most?',
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('signal') ||
      input.includes('trade') ||
      input.includes('win rate') ||
      input.includes('performance')
    ) {
      intent = 'interested';
      shouldOfferDiscount = true;
      return {
        response:
          'Our AI trading signals have achieved impressive results! We use advanced algorithms analyzing market conditions 24/7. Our signals are delivered in real-time via Discord, email, and dashboard. Many traders see significant improvements in their trading performance. Would you like to see our latest performance data?',
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('guarantee') ||
      input.includes('refund') ||
      input.includes('money back') ||
      input.includes('risk')
    ) {
      intent = 'interested';
      return {
        response:
          "Absolutely! We offer a monthly no-loss guarantee - if our signals result in a net loss for any month, you get a full refund. No questions asked. This shows our confidence in our system. It's like having insurance on your trading!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('discord') ||
      input.includes('community') ||
      input.includes('group')
    ) {
      intent = 'interested';
      return {
        response:
          "Our Discord community is amazing! You get access to fellow traders, real-time discussions, strategy sharing, and our support team. It's free to join and you'll learn so much. Plus, you can earn €19 for every referral!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('referral') ||
      input.includes('earn') ||
      input.includes('reward') ||
      input.includes('money')
    ) {
      intent = 'interested';
      return {
        response:
          'Our referral program is fantastic! Earn €19 for every successful referral who subscribes to any premium plan. You get your unique link from the dashboard. Many users earn more from referrals than their subscription costs!',
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('start') ||
      input.includes('sign up') ||
      input.includes('register') ||
      input.includes('join')
    ) {
      intent = 'ready';
      shouldOfferDiscount = true;
      return {
        response:
          "Perfect! Let's get you started. You can sign up for free and join our Discord community immediately. For full access to our AI signals, you'll want Premium or VIP. I can help you choose the right plan for your trading goals!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('expensive') ||
      input.includes('too much') ||
      input.includes('costly') ||
      input.includes('cheap')
    ) {
      intent = 'objection';
      shouldOfferDiscount = true;
      return {
        response:
          "I understand cost is important! Consider this: our Premium plan costs less than a coffee per day, and many users earn that back in their first week of trading. Plus, with our no-loss guarantee, you literally can't lose money. The real question is: can you afford NOT to try it?",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('scam') ||
      input.includes('fake') ||
      input.includes('trust') ||
      input.includes('real')
    ) {
      intent = 'objection';
      return {
        response:
          "I completely understand your concern! We're a legitimate company with real users and transparent results. We offer a no-loss guarantee, have a thriving Discord community, and many users share their success stories. Plus, you can start free and see for yourself!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('help') ||
      input.includes('support') ||
      input.includes('contact')
    ) {
      return {
        response:
          "I'm here to help with anything! You can ask about our services, pricing, features, or how to get started. For technical support, reach us through Discord or email. What specific question do you have?",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('yes') ||
      input.includes('okay') ||
      input.includes('sure') ||
      input.includes('interested')
    ) {
      intent = 'ready';
      shouldOfferDiscount = true;
      return {
        response:
          "Excellent! I'm excited to help you get started. Would you like to see our pricing plans, or do you have any specific questions about the features? I can also show you how to sign up right now!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('no') ||
      input.includes('not interested') ||
      input.includes('maybe later')
    ) {
      intent = 'objection';
      shouldOfferDiscount = true;
      return {
        response:
          "No worries! But before you go, what's holding you back? Is it the price, timing, or something else? I'd love to address any concerns you might have.",
        intent,
        shouldOfferDiscount
      };
    }

    // Default response with gentle sales approach
    return {
      response:
        "That's a great question! I can help you with our AI trading signals, pricing, features, or how to get started. What aspect of PrimeScope interests you most? I'm here to make sure you have all the information you need!",
      intent,
      shouldOfferDiscount
    };
  };

  // Fallback responses when AI is not available
  const getFallbackResponse = (
    userInput: string
  ): {
    response: string;
    intent: 'browsing' | 'interested' | 'ready' | 'objection';
    shouldOfferDiscount: boolean;
  } => {
    const input = userInput.toLowerCase();
    let intent: 'browsing' | 'interested' | 'ready' | 'objection' = 'browsing';
    let shouldOfferDiscount = false;

    // Sales-focused responses with intent detection
    if (
      input.includes('price') ||
      input.includes('cost') ||
      input.includes('subscription') ||
      input.includes('how much')
    ) {
      intent = 'interested';
      shouldOfferDiscount = true;
      return {
        response:
          'PrimeScope offers three tiers: Free (limited), Premium ($29/month), and VIP ($99/month). Premium and VIP include our AI trading signals, priority support, and advanced analytics. The VIP tier also includes exclusive signals and 1-on-1 consultations. Which tier interests you most?',
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('signal') ||
      input.includes('trade') ||
      input.includes('win rate') ||
      input.includes('performance')
    ) {
      intent = 'interested';
      shouldOfferDiscount = true;
      return {
        response:
          'Our AI trading signals have achieved impressive results! We use advanced algorithms analyzing market conditions 24/7. Our signals are delivered in real-time via Discord, email, and dashboard. Many traders see significant improvements in their trading performance. Would you like to see our latest performance data?',
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('guarantee') ||
      input.includes('refund') ||
      input.includes('money back') ||
      input.includes('risk')
    ) {
      intent = 'interested';
      return {
        response:
          "Absolutely! We offer a monthly no-loss guarantee - if our signals result in a net loss for any month, you get a full refund. No questions asked. This shows our confidence in our system. It's like having insurance on your trading!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('discord') ||
      input.includes('community') ||
      input.includes('group')
    ) {
      intent = 'interested';
      return {
        response:
          "Our Discord community is amazing! You get access to fellow traders, real-time discussions, strategy sharing, and our support team. It's free to join and you'll learn so much. Plus, you can earn €19 for every referral!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('referral') ||
      input.includes('earn') ||
      input.includes('reward') ||
      input.includes('money')
    ) {
      intent = 'interested';
      return {
        response:
          'Our referral program is fantastic! Earn €19 for every successful referral who subscribes to any premium plan. You get your unique link from the dashboard. Many users earn more from referrals than their subscription costs!',
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('start') ||
      input.includes('sign up') ||
      input.includes('register') ||
      input.includes('join')
    ) {
      intent = 'ready';
      shouldOfferDiscount = true;
      return {
        response:
          "Perfect! Let's get you started. You can sign up for free and join our Discord community immediately. For full access to our AI signals, you'll want Premium or VIP. I can help you choose the right plan for your trading goals!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('expensive') ||
      input.includes('too much') ||
      input.includes('costly') ||
      input.includes('cheap')
    ) {
      intent = 'objection';
      shouldOfferDiscount = true;
      return {
        response:
          "I understand cost is important! Consider this: our Premium plan costs less than a coffee per day, and many users earn that back in their first week of trading. Plus, with our no-loss guarantee, you literally can't lose money. The real question is: can you afford NOT to try it?",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('scam') ||
      input.includes('fake') ||
      input.includes('trust') ||
      input.includes('real')
    ) {
      intent = 'objection';
      return {
        response:
          "I completely understand your concern! We're a legitimate company with real users and transparent results. We offer a no-loss guarantee, have a thriving Discord community, and many users share their success stories. Plus, you can start free and see for yourself!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('help') ||
      input.includes('support') ||
      input.includes('contact')
    ) {
      return {
        response:
          "I'm here to help with anything! You can ask about our services, pricing, features, or how to get started. For technical support, reach us through Discord or email. What specific question do you have?",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('yes') ||
      input.includes('okay') ||
      input.includes('sure') ||
      input.includes('interested')
    ) {
      intent = 'ready';
      shouldOfferDiscount = true;
      return {
        response:
          "Excellent! I'm excited to help you get started. Would you like to see our pricing plans, or do you have any specific questions about the features? I can also show you how to sign up right now!",
        intent,
        shouldOfferDiscount
      };
    }

    if (
      input.includes('no') ||
      input.includes('not interested') ||
      input.includes('maybe later')
    ) {
      intent = 'objection';
      shouldOfferDiscount = true;
      return {
        response:
          "No worries! But before you go, what's holding you back? Is it the price, timing, or something else? I'd love to address any concerns you might have.",
        intent,
        shouldOfferDiscount
      };
    }

    // Default response with gentle sales approach
    return {
      response:
        "That's a great question! I can help you with our AI trading signals, pricing, features, or how to get started. What aspect of PrimeScope interests you most? I'm here to make sure you have all the information you need!",
      intent,
      shouldOfferDiscount
    };
  };

  const offerDiscount = () => {
    if (hasReceivedDiscount) return;

    setHasReceivedDiscount(true);

    const discountCode = `EARLY20`;
    const discountMessage: Message = {
      id: Date.now().toString(),
      text: `🎉 Special offer just for you! Use code **${discountCode}** for 20% off your first month of Premium or VIP! This code is limited for the first 10 users! Ready to start your trading journey?`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'discount'
    };

    setMessages((prev) => [...prev, discountMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          <Bot className="w-3 h-3" />
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 h-[500px] bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">AI Trading Assistant</h3>
                <p className="text-sm text-blue-100">
                  Ask me anything about PrimeScope
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'discount'
                        ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white border-2 border-emerald-400'
                        : 'bg-slate-700 text-white'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.sender === 'bot' && (
                      <Bot className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{message.text}</p>
                      {message.type === 'discount' && (
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() => window.open('/pricing', '_blank')}
                            className="bg-white text-emerald-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors"
                          >
                            View Pricing
                          </button>
                          <button
                            onClick={() => window.open('/signin', '_blank')}
                            className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors"
                          >
                            Sign Up Now
                          </button>
                        </div>
                      )}
                      <p className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {message.sender === 'user' && (
                      <User className="w-4 h-4 text-blue-200 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-white rounded-2xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                variant="primary"
                size="sm"
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
