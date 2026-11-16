// The text of the shop's policy pages (/policies/refund-policy and so on).
//
// Everything the shop decides for itself is in POLICY_CONFIG: change a number or
// a sentence there and every page that mentions it updates. These are sensible
// starting drafts written for a small Ghanaian beauty retailer. The owner must
// check them against how the shop really works, and ideally have a lawyer read
// them, before relying on them.

export const POLICY_CONFIG = {
  business: "Becca Nena Beauty Studio",
  address: "East Legon, Boundary Rd, Accra, Ghana",
  phone: "+233 24 701 8569",
  /** Add the shop's email when it exists, for example "info@yourdomain.com". Left off the pages while empty. */
  email: "",
  website: "beccanenabeautystudio.com",
  updated: "16 November 2026",

  /** Days after purchase or delivery that a return can be started. */
  returnWindowDays: 7,
  /** How long an approved refund takes to be sent. */
  refundProcessing: "within 7 working days",
  /** How long it takes to prepare a paid order. */
  orderProcessing: "1 to 2 working days",
} as const;

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface Policy {
  slug: string;
  title: string;
  intro: string;
  sections: PolicySection[];
}

const c = POLICY_CONFIG;

const contactSection: PolicySection = {
  heading: "Contact us",
  paragraphs: [
    `${c.business}, ${c.address}.`,
    `WhatsApp or call: ${c.phone}.${c.email ? ` Email: ${c.email}.` : ""}`,
  ],
};

export const POLICIES: Record<string, Policy> = {
  "refund-policy": {
    slug: "refund-policy",
    title: "Refund policy",
    intro:
      "We want you to love what you buy from us. This page explains when you can return a product and how refunds work.",
    sections: [
      {
        heading: "Returning a product",
        paragraphs: [
          `You can ask to return a product within ${c.returnWindowDays} days of buying it in store or receiving it. To be accepted, the product must be:`,
        ],
        list: [
          "unopened, unused and still sealed",
          "in its original packaging, in the same condition you received it",
          "accompanied by your receipt or order number (for example #BN-1052)",
        ],
      },
      {
        heading: "Faulty, damaged or wrong items",
        paragraphs: [
          `If something arrives faulty, damaged or is not what you ordered, contact us within ${c.returnWindowDays} days with your order number and clear photos. We will replace the item or refund you.`,
        ],
      },
      {
        heading: "Products we cannot take back",
        paragraphs: [
          "For hygiene and safety reasons we cannot accept returns of skincare, body care and beauty products that have been opened, used or tested, unless they are faulty or damaged. We also cannot accept returns without proof of purchase, or after the return period has passed.",
        ],
      },
      {
        heading: "How to start a return",
        list: [
          `Message us on WhatsApp (${c.phone}) with your order number and photos, or bring the item to our store at ${c.address}.`,
          "Our team will check the item and confirm whether the return is approved.",
          "Do not send an item back before we have confirmed the return with you.",
        ],
      },
      {
        heading: "Refunds",
        paragraphs: [
          `Approved refunds are sent ${c.refundProcessing} of the return being approved. Refunds for online orders go back to the payment method you used (Mobile Money or card, through Paystack). Refunds for purchases made in store are paid the way we agree with you at the counter. Your bank or mobile money provider may need extra time to show the money.`,
          "Delivery fees are paid directly to the courier and are separate from your order, so we cannot refund them. If we sent you the wrong or a faulty item, contact us and we will find a fair solution.",
        ],
      },
      {
        heading: "Exchanges",
        paragraphs: [
          "If you would rather swap an item, tell us when you contact us. Exchanges depend on the replacement being in stock.",
        ],
      },
      contactSection,
    ],
  },

  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy policy",
    intro: `${c.business} respects your privacy. This page explains what information we collect, why, and the choices you have.`,
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          `${c.business}, ${c.address}. In this policy, "we" and "us" mean ${c.business}.`,
        ],
      },
      {
        heading: "Information we collect",
        list: [
          "Details you give us when you order: your name, phone number, WhatsApp number, email address, delivery location and any notes.",
          "Your order and purchase history with us, including in-store purchases (if you give us your name or phone number).",
          "Your email address, if you subscribe to our newsletter.",
          "Payment confirmation. Payments are processed by Paystack. We do not see or store your full card details or Mobile Money PIN. We receive confirmation that a payment was made, its reference and the payment method.",
          "Basic technical information that websites normally record, such as your device and browser type, and your shopping cart, which is remembered in your browser so it is still there when you come back.",
        ],
      },
      {
        heading: "How we use your information",
        list: [
          "To process, prepare, deliver and confirm your orders.",
          "To contact you about your order by WhatsApp, phone or email.",
          "To issue receipts and handle returns and refunds.",
          "To send our newsletter and offers, only if you subscribed.",
          "To keep our systems secure, prevent fraud and meet our legal and accounting duties.",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "We do not sell your information. We share it only where needed to serve you:",
        ],
        list: [
          "Paystack, to process your payment.",
          "Delivery couriers, who receive your name, phone number and address so they can deliver your order.",
          "Service providers that run our website and systems for us, including our hosting provider (Vercel), our database provider (Supabase) and our email provider (Resend). They handle data only on our behalf.",
          "Authorities, if the law requires us to.",
        ],
      },
      {
        heading: "Newsletter",
        paragraphs: [
          "You can unsubscribe at any time using the link in our emails, or by contacting us.",
        ],
      },
      {
        heading: "Cookies and similar storage",
        paragraphs: [
          "We use only the small pieces of browser storage the site needs to work, such as remembering your cart. We do not currently use advertising cookies. If that changes, we will update this page.",
        ],
      },
      {
        heading: "How long we keep your information",
        paragraphs: [
          "We keep order records for as long as we need them for returns, accounting and legal reasons. Newsletter details are kept until you unsubscribe. We then delete or anonymise information we no longer need.",
        ],
      },
      {
        heading: "Keeping it safe",
        paragraphs: [
          "We use reasonable technical and organisational measures to protect your information. No system is completely secure, but we work to keep your data safe.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under Ghana's Data Protection Act, 2012 (Act 843), you can ask to see the personal information we hold about you, ask us to correct it, or ask us to delete it where we have no legal reason to keep it. You can also object to us using it for marketing. Contact us using the details below. You also have the right to complain to Ghana's Data Protection Commission.",
        ],
      },
      {
        heading: "Children",
        paragraphs: [
          "Our website is not aimed at children, and we do not knowingly collect information from them.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          `We may update this policy from time to time. The date at the top shows when it was last changed.`,
        ],
      },
      contactSection,
    ],
  },

  "terms-of-service": {
    slug: "terms-of-service",
    title: "Terms of service",
    intro: `These terms apply when you use our website or buy from ${c.business}. By placing an order you agree to them.`,
    sections: [
      {
        heading: "About us",
        paragraphs: [`${c.business}, ${c.address}. Phone and WhatsApp: ${c.phone}.`],
      },
      {
        heading: "Products and information",
        paragraphs: [
          "We try to describe and photograph our products accurately, but colours can look different on different screens, and packaging may change. Products are subject to availability. If an item is out of stock or an error in a price or description is found, we may correct it or cancel your order and refund what you paid.",
        ],
      },
      {
        heading: "Prices and payment",
        paragraphs: [
          "All prices are in Ghana cedis (GH₵). You pay for your order online through Paystack, using Mobile Money or a card. Delivery fees are not part of your order total: they are arranged and paid separately to the courier (see our Shipping policy).",
        ],
      },
      {
        heading: "Your order",
        paragraphs: [
          "Your order is not final until your payment has been confirmed. After that, our team contacts you to confirm the details and arrange delivery. We may refuse or cancel an order, for example if an item is unavailable, a price was shown wrongly, or we suspect fraud. If we cancel an order you have paid for, we will refund you in full.",
        ],
      },
      {
        heading: "Delivery, returns and refunds",
        paragraphs: [
          "Delivery is described in our Shipping policy. Returns and refunds are described in our Refund policy. Both form part of these terms.",
        ],
      },
      {
        heading: "Using our products safely",
        paragraphs: [
          "Our products are cosmetics, not medicines. Read the label and follow the directions. If you have sensitive skin or allergies, check the ingredients and do a patch test first. Stop using a product and seek advice if it causes irritation.",
        ],
      },
      {
        heading: "Our content",
        paragraphs: [
          "The text, images, logo and design on this website belong to us or are used with permission. Please do not copy or reuse them without asking us first.",
        ],
      },
      {
        heading: "Using the website",
        paragraphs: [
          "Please use the site lawfully and do not try to interfere with it, break into it or misuse it.",
        ],
      },
      {
        heading: "Our responsibility",
        paragraphs: [
          "We do our best to run the website and to supply products as described. To the extent the law allows, we are not responsible for losses that were not reasonably foreseeable, or for delays and problems caused by things outside our control, such as courier delays, network outages or payment provider downtime. Nothing in these terms limits any right you have under the law that cannot be limited.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: ["These terms are governed by the laws of Ghana."],
      },
      {
        heading: "Changes to these terms",
        paragraphs: [
          "We may update these terms from time to time. The version on this page, with the date above, is the one that applies.",
        ],
      },
      contactSection,
    ],
  },

  "shipping-policy": {
    slug: "shipping-policy",
    title: "Shipping policy",
    intro:
      "You can collect your order from our store or have it delivered by a courier. This page explains how both work.",
    sections: [
      {
        heading: "Collect from our store",
        paragraphs: [
          `You are welcome to collect your order from ${c.business}, ${c.address}. Message us on WhatsApp (${c.phone}) first so we can confirm your order is ready.`,
        ],
      },
      {
        heading: "Delivery by courier",
        paragraphs: [
          "We send orders with independent delivery couriers. Here is how it works:",
        ],
        list: [
          "You place your order and pay for your products online.",
          "Our team contacts you by WhatsApp or phone to confirm your items, your delivery address and a convenient time.",
          "We arrange a courier. The courier's delivery fee depends on where you are, and you pay it directly to the courier. It is separate from your order total.",
        ],
      },
      {
        heading: "Preparing your order",
        paragraphs: [
          `Paid orders are usually prepared within ${c.orderProcessing}. Orders placed late in the day or on weekends and public holidays may take a little longer.`,
        ],
      },
      {
        heading: "Delivery times",
        paragraphs: [
          "Delivery times depend on the courier and your location, and we will give you an estimate when we confirm your order. Delays can happen because of traffic, weather, public holidays and other things outside our control.",
        ],
      },
      {
        heading: "Your delivery details",
        paragraphs: [
          "Please give us an accurate address, a landmark if helpful, and a phone number you can answer on the day. If the courier cannot reach you, a repeat delivery attempt may carry another courier fee.",
        ],
      },
      {
        heading: "Checking your parcel",
        paragraphs: [
          `Please check your parcel when it arrives. If an item is damaged, missing or wrong, contact us as soon as possible, ideally the same day, with your order number and photos, and within ${c.returnWindowDays} days at the latest. See our Refund policy for what happens next.`,
        ],
      },
      contactSection,
    ],
  },
};

/** Footer link order. */
export const POLICY_LINKS = [
  { slug: "refund-policy", label: "Refund policy" },
  { slug: "privacy-policy", label: "Privacy policy" },
  { slug: "terms-of-service", label: "Terms of service" },
  { slug: "shipping-policy", label: "Shipping policy" },
] as const;
