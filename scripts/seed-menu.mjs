/**
 * Seed Script — Uploads food images to Cloudinary & seeds 10 categories / 100 menu items to Firestore
 *
 * Usage:
 *   1. Fill in CLOUDINARY_* values in .env
 *   2. Place your Firebase service account JSON as serviceAccountKey.json in project root
 *      (download from Firebase Console → Project Settings → Service Accounts → Generate New Private Key)
 *   3. Run: node scripts/seed-menu.mjs
 */

import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

// ── Cloudinary setup ──
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Firebase Admin setup ──
const serviceAccountPath = resolve(__dirname, '..', 'serviceAccountKey.json');
let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
} catch {
    console.error('❌ serviceAccountKey.json not found in project root.');
    console.error('   Download from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ── 10 Categories with 10 items each = 100 items ──
const categories = [
    {
        name: 'Starters',
        items: [
            { name: 'Paneer Tikka', price: 249, desc: 'Marinated cottage cheese grilled in tandoor', img: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop' },
            { name: 'Chicken Wings', price: 299, desc: 'Crispy fried wings with hot sauce', img: 'https://images.unsplash.com/photo-1608039829572-9b0189d30684?w=400&h=300&fit=crop' },
            { name: 'Spring Rolls', price: 199, desc: 'Crispy vegetable spring rolls', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop' },
            { name: 'Fish Fingers', price: 349, desc: 'Golden fried fish fingers with tartar', img: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&h=300&fit=crop' },
            { name: 'Onion Rings', price: 149, desc: 'Beer-battered onion rings', img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop' },
            { name: 'Samosa', price: 99, desc: 'Crispy potato & peas pastry', img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop' },
            { name: 'Bruschetta', price: 229, desc: 'Toasted bread with tomato & basil', img: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop' },
            { name: 'Garlic Bread', price: 149, desc: 'Cheesy garlic bread sticks', img: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400&h=300&fit=crop' },
            { name: 'Nachos Grande', price: 279, desc: 'Loaded nachos with cheese & jalapeños', img: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop' },
            { name: 'Mushroom Soup', price: 179, desc: 'Creamy wild mushroom soup', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Main Course',
        items: [
            { name: 'Butter Chicken', price: 399, desc: 'Creamy tomato-based chicken curry', img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop' },
            { name: 'Dal Makhani', price: 299, desc: 'Slow-cooked creamy black lentils', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop' },
            { name: 'Chicken Biryani', price: 349, desc: 'Fragrant basmati rice with spiced chicken', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop' },
            { name: 'Palak Paneer', price: 279, desc: 'Spinach & cottage cheese curry', img: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop' },
            { name: 'Grilled Salmon', price: 699, desc: 'Atlantic salmon with lemon dill sauce', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop' },
            { name: 'Lamb Rogan Josh', price: 499, desc: 'Kashmiri-style spiced lamb curry', img: 'https://images.unsplash.com/photo-1545247181-516773cae754?w=400&h=300&fit=crop' },
            { name: 'Mushroom Risotto', price: 349, desc: 'Creamy Italian rice with porcini', img: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=300&fit=crop' },
            { name: 'Prawn Curry', price: 549, desc: 'Coastal-style prawns in coconut curry', img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop' },
            { name: 'Chole Bhature', price: 199, desc: 'Spiced chickpeas with fried bread', img: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&h=300&fit=crop' },
            { name: 'Tandoori Chicken', price: 449, desc: 'Whole chicken marinated & roasted in tandoor', img: 'https://images.unsplash.com/photo-1610057099443-fde6c99db9e1?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Pizza',
        items: [
            { name: 'Margherita', price: 299, desc: 'Classic tomato, mozzarella & basil', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop' },
            { name: 'Pepperoni', price: 399, desc: 'Loaded pepperoni with extra cheese', img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop' },
            { name: 'BBQ Chicken', price: 449, desc: 'Smoky BBQ sauce with grilled chicken', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop' },
            { name: 'Veggie Supreme', price: 349, desc: 'Bell peppers, olives, mushrooms & onions', img: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop' },
            { name: 'Four Cheese', price: 449, desc: 'Mozzarella, cheddar, gouda & parmesan', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop' },
            { name: 'Paneer Tikka Pizza', price: 399, desc: 'Indian fusion with tikka paneer', img: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=400&h=300&fit=crop' },
            { name: 'Hawaiian', price: 349, desc: 'Ham, pineapple & mozzarella', img: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop' },
            { name: 'Meat Feast', price: 499, desc: 'Sausage, bacon, ham & pepperoni', img: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=400&h=300&fit=crop' },
            { name: 'Mushroom Truffle', price: 549, desc: 'Wild mushrooms with truffle oil', img: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop' },
            { name: 'Garlic Prawn', price: 599, desc: 'Garlic butter prawns on thin crust', img: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Burgers',
        items: [
            { name: 'Classic Beef Burger', price: 299, desc: 'Juicy beef patty with lettuce & tomato', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop' },
            { name: 'Chicken Zinger', price: 279, desc: 'Crispy fried chicken with spicy mayo', img: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop' },
            { name: 'Veggie Burger', price: 229, desc: 'Black bean & quinoa patty', img: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop' },
            { name: 'Double Smash', price: 399, desc: 'Two smashed patties with double cheese', img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop' },
            { name: 'BBQ Bacon Burger', price: 349, desc: 'BBQ sauce, crispy bacon & cheddar', img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop' },
            { name: 'Mushroom Swiss', price: 329, desc: 'Sautéed mushrooms & swiss cheese', img: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=300&fit=crop' },
            { name: 'Fish Burger', price: 299, desc: 'Crispy fish fillet with tartar sauce', img: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=400&h=300&fit=crop' },
            { name: 'Paneer Burger', price: 249, desc: 'Grilled paneer with mint chutney', img: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop' },
            { name: 'Lamb Burger', price: 449, desc: 'Spiced lamb patty with tzatziki', img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop' },
            { name: 'Truffle Burger', price: 499, desc: 'Wagyu patty with truffle aïoli', img: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Pasta',
        items: [
            { name: 'Spaghetti Bolognese', price: 299, desc: 'Classic meat ragù with spaghetti', img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop' },
            { name: 'Penne Alfredo', price: 279, desc: 'Creamy parmesan Alfredo sauce', img: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400&h=300&fit=crop' },
            { name: 'Pesto Pasta', price: 279, desc: 'Basil pesto with pine nuts & parmesan', img: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=300&fit=crop' },
            { name: 'Arrabiata', price: 249, desc: 'Spicy tomato sauce with chili flakes', img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop' },
            { name: 'Carbonara', price: 349, desc: 'Egg, pecorino, guanciale & black pepper', img: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop' },
            { name: 'Lasagna', price: 399, desc: 'Layered pasta with meat & béchamel', img: 'https://images.unsplash.com/photo-1619895862022-09114b41f16f?w=400&h=300&fit=crop' },
            { name: 'Mac & Cheese', price: 249, desc: 'Baked macaroni with three cheeses', img: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=400&h=300&fit=crop' },
            { name: 'Mushroom Pasta', price: 299, desc: 'Mixed mushrooms in garlic cream', img: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&h=300&fit=crop' },
            { name: 'Seafood Pasta', price: 449, desc: 'Prawns, calamari & mussels in marinara', img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop' },
            { name: 'Ravioli', price: 379, desc: 'Ricotta & spinach stuffed ravioli', img: 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Rice & Noodles',
        items: [
            { name: 'Fried Rice', price: 199, desc: 'Wok-tossed rice with vegetables', img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop' },
            { name: 'Hakka Noodles', price: 219, desc: 'Stir-fried Indo-Chinese noodles', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop' },
            { name: 'Pad Thai', price: 299, desc: 'Thai rice noodles with peanuts', img: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=300&fit=crop' },
            { name: 'Singapore Noodles', price: 279, desc: 'Curry-spiced rice vermicelli', img: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop' },
            { name: 'Jeera Rice', price: 149, desc: 'Cumin-tempered basmati rice', img: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&h=300&fit=crop' },
            { name: 'Schezwan Noodles', price: 249, desc: 'Fiery schezwan sauce with noodles', img: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop' },
            { name: 'Pulao', price: 199, desc: 'Fragrant mixed vegetable rice', img: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop' },
            { name: 'Egg Fried Rice', price: 229, desc: 'Fried rice with scrambled eggs', img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop' },
            { name: 'Ramen', price: 349, desc: 'Japanese noodle soup with toppings', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop' },
            { name: 'Thai Green Curry Rice', price: 329, desc: 'Coconut green curry with jasmine rice', img: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Salads',
        items: [
            { name: 'Caesar Salad', price: 249, desc: 'Romaine, croutons, parmesan & Caesar dressing', img: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop' },
            { name: 'Greek Salad', price: 229, desc: 'Feta, olives, cucumber & tomatoes', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop' },
            { name: 'Garden Salad', price: 179, desc: 'Fresh mixed greens with vinaigrette', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' },
            { name: 'Grilled Chicken Salad', price: 299, desc: 'Grilled chicken breast on mixed greens', img: 'https://images.unsplash.com/photo-1604497181015-76590d828012?w=400&h=300&fit=crop' },
            { name: 'Quinoa Bowl', price: 279, desc: 'Quinoa with avocado & roasted veggies', img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop' },
            { name: 'Caprese Salad', price: 249, desc: 'Mozzarella, tomato & basil with balsamic', img: 'https://images.unsplash.com/photo-1608032077018-c9aad9565d29?w=400&h=300&fit=crop' },
            { name: 'Coleslaw', price: 129, desc: 'Crunchy cabbage slaw with creamy dressing', img: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&h=300&fit=crop' },
            { name: 'Asian Slaw', price: 199, desc: 'Sesame-ginger dressing with edamame', img: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&h=300&fit=crop' },
            { name: 'Tuna Salad', price: 349, desc: 'Seared tuna on mixed greens with wasabi', img: 'https://images.unsplash.com/photo-1580013759032-c96505e24c1f?w=400&h=300&fit=crop' },
            { name: 'Fruit Salad', price: 199, desc: 'Seasonal fresh fruits with honey-lime', img: 'https://images.unsplash.com/photo-1564093497595-593b96d80180?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Desserts',
        items: [
            { name: 'Chocolate Brownie', price: 199, desc: 'Warm fudgy brownie with ice cream', img: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=300&fit=crop' },
            { name: 'Tiramisu', price: 299, desc: 'Classic Italian coffee dessert', img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop' },
            { name: 'Cheesecake', price: 279, desc: 'New York style baked cheesecake', img: 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=400&h=300&fit=crop' },
            { name: 'Gulab Jamun', price: 149, desc: 'Warm milk dumplings in sugar syrup', img: 'https://images.unsplash.com/photo-1666190066824-e28d0cfee922?w=400&h=300&fit=crop' },
            { name: 'Ice Cream Sundae', price: 249, desc: 'Three scoops with chocolate & nuts', img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop' },
            { name: 'Panna Cotta', price: 249, desc: 'Italian vanilla cream with berry coulis', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop' },
            { name: 'Crème Brûlée', price: 279, desc: 'Caramelized custard vanilla bean', img: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&h=300&fit=crop' },
            { name: 'Rasmalai', price: 179, desc: 'Cottage cheese patties in sweet milk', img: 'https://images.unsplash.com/photo-1601303516-0956b45f5ecb?w=400&h=300&fit=crop' },
            { name: 'Lava Cake', price: 299, desc: 'Molten chocolate center cake', img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop' },
            { name: 'Apple Pie', price: 229, desc: 'Warm cinnamon apple pie with cream', img: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Beverages',
        items: [
            { name: 'Masala Chai', price: 49, desc: 'Indian spiced milk tea', img: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400&h=300&fit=crop' },
            { name: 'Cappuccino', price: 149, desc: 'Espresso with steamed milk foam', img: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop' },
            { name: 'Cold Coffee', price: 179, desc: 'Iced coffee with cream & chocolate', img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop' },
            { name: 'Fresh Lime Soda', price: 99, desc: 'Freshly squeezed lime with soda', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed514?w=400&h=300&fit=crop' },
            { name: 'Mango Lassi', price: 149, desc: 'Sweet mango yogurt drink', img: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&h=300&fit=crop' },
            { name: 'Green Tea', price: 79, desc: 'Premium Japanese green tea', img: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&h=300&fit=crop' },
            { name: 'Mojito', price: 199, desc: 'Mint, lime & soda mocktail', img: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop' },
            { name: 'Watermelon Juice', price: 129, desc: 'Fresh watermelon with mint', img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop' },
            { name: 'Hot Chocolate', price: 179, desc: 'Rich Belgian chocolate with marshmallows', img: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=300&fit=crop' },
            { name: 'Strawberry Shake', price: 199, desc: 'Fresh strawberry milkshake', img: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=300&fit=crop' },
        ],
    },
    {
        name: 'Breads',
        items: [
            { name: 'Butter Naan', price: 59, desc: 'Soft buttered flatbread from tandoor', img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop' },
            { name: 'Garlic Naan', price: 79, desc: 'Naan stuffed with garlic & herbs', img: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop' },
            { name: 'Cheese Naan', price: 99, desc: 'Naan stuffed with melted cheese', img: 'https://images.unsplash.com/photo-1586444248879-bc604bc77811?w=400&h=300&fit=crop' },
            { name: 'Roti', price: 39, desc: 'Whole wheat Indian flatbread', img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop' },
            { name: 'Paratha', price: 69, desc: 'Layered flaky Indian bread', img: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=300&fit=crop' },
            { name: 'Kulcha', price: 79, desc: 'Stuffed leavened bread', img: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=300&fit=crop' },
            { name: 'Puri', price: 49, desc: 'Deep fried puffed bread', img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop' },
            { name: 'Lachha Parantha', price: 89, desc: 'Multi-layered crispy parantha', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop' },
            { name: 'Missi Roti', price: 59, desc: 'Gram flour spiced flatbread', img: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop' },
            { name: 'Tandoori Roti', price: 49, desc: 'Whole wheat bread baked in tandoor', img: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=300&fit=crop' },
        ],
    },
];

// ── Upload image to Cloudinary ──
async function uploadToCloudinary(imageUrl, folder, name) {
    try {
        const result = await cloudinary.uploader.upload(imageUrl, {
            folder: `hms-menu/${folder}`,
            public_id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            overwrite: true,
            transformation: [{ width: 400, height: 300, crop: 'fill', quality: 'auto' }],
        });
        return result.secure_url;
    } catch (error) {
        console.warn(`  ⚠ Cloudinary upload failed for ${name}, using original URL`);
        return imageUrl;
    }
}

// ── Main seed function ──
async function seed() {
    console.log('🌱 Starting seed...\n');

    // Check Cloudinary config
    const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';
    if (!useCloudinary) {
        console.log('⚠ Cloudinary not configured — using Unsplash URLs directly.\n');
    }

    let totalItems = 0;

    for (const category of categories) {
        console.log(`📁 Category: ${category.name}`);

        for (const item of category.items) {
            let imageUrl = item.img;

            if (useCloudinary) {
                process.stdout.write(`   📸 Uploading ${item.name}... `);
                imageUrl = await uploadToCloudinary(item.img, category.name, item.name);
                console.log('✅');
            }

            await db.collection('menu').add({
                name: item.name,
                category: category.name,
                price: item.price,
                description: item.desc,
                image: imageUrl,
                available: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            totalItems++;
        }

        console.log(`   ✅ ${category.items.length} items added\n`);
    }

    console.log(`\n🎉 Done! Seeded ${categories.length} categories and ${totalItems} menu items.`);
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
