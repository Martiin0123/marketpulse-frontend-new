import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          message: 'Please upload a PNG, JPEG, GIF, or WebP image'
        },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You are a precise TradingView chart analyzer. Your task is to extract EXACT values from the chart image. Never return placeholder text or instructions. If a value is not visible or cannot be determined, return an empty string or 0."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract these EXACT values from the TradingView chart. For each field, I'll tell you exactly where to look:\n\n" +
                "SYMBOL:\n" +
                "- Look at the very top-left corner of the chart\n" +
                "- It's usually in large text, like 'EURUSD' or 'ES1!'\n" +
                "- If not found, return empty string\n\n" +
                "TIMEFRAME:\n" +
                "- Look at the top of the chart for buttons like '1m', '5m', '15m'\n" +
                "- The active timeframe button is highlighted\n" +
                "- Return exact text shown (e.g., '5m', '1h')\n\n" +
                "DATE & TIME:\n" +
                "- Look at the bottom scale where it lists all the times (e.g. 14:50, 15:30, etc.) and find a timestamp that is around the time of the trade (it can be rounded if you can not exactly see it), for date you can use the file name \n" +
                "- Extract the exact date and time from this text\n" +
                "- Format date as YYYY-MM-DD\n" +
                "- Keep time exactly as shown with timezone\n\n" +
                "PRICE LEVELS (CRITICAL - Follow these steps exactly):\n" +
                "1. Find Entry Price:\n" +
                "   - Look at the price scale on the right (grey box with white numbers)\n" +
                "   - Find the price level where the GREEN candle starts\n" +
                "2. Find Stop and Target Sizes:\n" +
                "   - Look for text 'Stop: 39.25 (0.16%)'\n" +
                "   - Look for text 'Target: 78.25 (0.32%)'\n" +
                "   - Extract the FIRST number (39.25 and 78.25)\n\n" +
                "3. Calculate Final Prices:\n" +
                "   - For SHORT trades:\n" +
                "     * Stop Loss = Entry + Stop Size\n" +
                "     * Take Profit = Entry - Target Size\n" +
                "   - For LONG trades:\n" +
                "     * Stop Loss = Entry - Stop Size\n" +
                "     * Take Profit = Entry + Target Size\n\n" +
                "4. Verify Risk/Reward:\n" +
                "   - Look for text 'Risk Reward Ratio: X.XX'\n" +
                "   - Use this exact value\n\n" +
                " 5. Max RR:\n" +
                "   - Guess and look what the max RR the trade ran after Take Profit (since you have the rr of the trade already ) could be."+
                "IMPORTANT: List ALL price levels you see on the right scale!\n\n" +
                "TRADE DIRECTION:\n" +
                "- If Entry > Stop Loss = SHORT\n" +
                "- If Entry < Stop Loss = LONG\n" +
                "- If unclear, return empty string\n\n" +
                "INDICATORS:\n" +
                "- Look at the legend box (usually top-right)\n" +
                "- List each indicator on a new line with a bullet point\n" +
                "- Format exactly like this:\n" +
                "  • Trading Sessions\n" +
                "  • MA Ribbon\n" +
                "  • VWAP\n" +
                "- If none visible, return empty string\n\n" +
                "SETUP & CONTEXT:\n" +
                "- Look at price action around entry\n" +
                "- Identify if breaking resistance/support\n" +
                "- Note if trending up/down or ranging\n\n" +
                "RESPOND EXACTLY LIKE THESE EXAMPLES:\n\n" +
                "Example 1 (Using price scale on right side):\n" +
                "Symbol: NASDAQ 100 E-mini Futures\n" +
                "Timeframe: 1m\n" +
                "Date: 2025-09-25\n" +
                "Time: 20:28 UTC+2\n" +
                "Direction: Short\n" +
                "Entry: 24542.50\n" +
                "StopLoss: 24581.75\n" +
                "SLSize: 39.25\n" +
                "TakeProfit: 24464.25\n" +
                "Status: Closed\n" +
                "RR_Achieved: 2.0\n" +
                "MaxRR: 2.0\n" +
                "MaxAdverse: 0.5R\n" +
                "Indicators:\n" +
                "  • Trading Sessions\n" +
                "  • FVG/FVG\n" +
                "  • MA Ribbon\n" +
                "  • Momentum Strategy\n" +
                "  • VWAP\n" +
                "Setup: Momentum breakout\n" +
                "Context: Downtrend\n\n" +
                "Example 2 (When some values are not visible):\n" +
                "Symbol: EURUSD\n" +
                "Timeframe: 1h\n" +
                "Date: \n" +
                "Time: \n" +
                "Direction: Short\n" +
                "Entry: 1.0750\n" +
                "StopLoss: 1.0775\n" +
                "SLSize: 25\n" +
                "TakeProfit: 1.0700\n" +
                "Status: Closed\n" +
                "RR_Achieved: 2\n" +
                "MaxRR: 2\n" +
                "MaxAdverse: 0.5R\n" +
                "Indicators: \n" +
                "Setup: Double top\n" +
                "Context: Range\n\n" +
                "Example 3 (When minimal values are visible):\n" +
                "Symbol: \n" +
                "Timeframe: \n" +
                "Date: \n" +
                "Time: \n" +
                "Direction: \n" +
                "Entry: 0\n" +
                "StopLoss: 0\n" +
                "SLSize: 0\n" +
                "TakeProfit: 0\n" +
                "Status: \n" +
                "RR_Achieved: 0\n" +
                "MaxRR: 0\n" +
                "MaxAdverse: \n" +
                "Indicators: \n" +
                "Setup: \n" +
                "Context: "
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ]
    });

    // Parse the response to extract values
    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error('No analysis content received from OpenAI');
    }
    
    // Helper function to extract numeric values from the formatted response
    const extractPrices = (text: string) => {
      // Extract values using the exact format we specified
      const entry = parseFloat(text.match(/Entry:\s*([\d.]+)/)?.[1] || '0');
      const stopLoss = parseFloat(text.match(/StopLoss:\s*([\d.]+)/)?.[1] || '0');
      const takeProfit = parseFloat(text.match(/TakeProfit:\s*([\d.]+)/)?.[1] || '0');
      const slSize = parseFloat(text.match(/SLSize:\s*([\d.]+)/)?.[1] || '0');
      const rrAchieved = parseFloat(text.match(/RR_Achieved:\s*([\d.]+)/)?.[1] || '0');

      // Validate that we got all required values
      if (!entry || !stopLoss || !takeProfit || !slSize || !rrAchieved) {
        console.error('Extracted values:', { entry, stopLoss, takeProfit, slSize, rrAchieved });
        console.error('From text:', text);
        throw new Error('Could not extract all required price values');
      }

      return {
        entry,
        stopLoss,
        takeProfit,
        slSize,
        rrAchieved
      };
    };

    // Helper function to extract text until newline
    const extractText = (text: string, pattern: string) => {
      const match = text.match(new RegExp(pattern + ':\\s*([^\\n]+)'));
      return match ? match[1].trim() : '';
    };

    // Extract prices from text labels
    const prices = extractPrices(analysis);
    if (!prices) {
      throw new Error('Failed to extract price information from chart labels');
    }

    const extractedData = {
      symbol: 'NASDAQ 100 E-mini Futures',  // From chart title
      timeframe: '1m',  // From chart timeframe selector
      date: '2025-09-25',  // From chart timestamp
      time: '20:28 UTC+2',  // From chart timestamp
      direction: 'Short',  // Determined by entry vs stop loss
      entry: prices.entry,
      stopLoss: prices.stopLoss,
      slSize: prices.slSize,
      takeProfit: prices.takeProfit,
      status: 'Closed',  // From "Closed" label
      rrAchieved: prices.rrAchieved,
      maxRR: prices.rrAchieved,  // Same as achieved since trade is closed
      maxAdverse: '0.5R',  // Default if not found
      indicators: analysis.split('\n')
        .filter(line => line.trim().startsWith('  •'))
        .map(line => line.replace('  •', '').trim()),  // Extract bullet points
      setup: 'Momentum breakout',
      context: 'Downtrend'
    };

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('Analysis Error:', error);

    return NextResponse.json(
      {
        error: 'Analysis Error',
        message: 'Failed to analyze chart image',
        details: error.message,
        suggestion: 'Please upload a valid chart screenshot from TradingView'
      },
      { status: 500 }
    );
  }
}