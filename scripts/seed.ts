/**
 * Database Seed Script
 *
 * Creates admin user + demo data in the existing MySQL database.
 * Run: npx tsx scripts/seed.ts
 */

import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || "CHhg(&*865cc",
  database: process.env.DB_NAME || 'store_db',
}

async function seed() {
  console.log('🌱 Starting database seed...')

  const pool = mysql.createPool(DB_CONFIG)

  try {
    // Test connection
    await pool.execute('SELECT 1')
    console.log('✅ Database connected')

    // 1. Create admin user
    const adminPassword = await bcrypt.hash('Admin@2024!', 12)
    const [existingAdmin] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@storify.com'])

    if ((existingAdmin as any[]).length === 0) {
      await pool.execute(
        `INSERT INTO users (name, email, password, role, mode, subscription_plan, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        ['System Admin', 'admin@storify.com', adminPassword, 'admin', 'unlimited', 'enterprise', 'active']
      )
      console.log('✅ Admin user created (admin@storify.com / Admin@2024!)')
    } else {
      // Update password of existing admin
      await pool.execute('UPDATE users SET password = ?, status = ? WHERE email = ?', [adminPassword, 'active', 'admin@storify.com'])
      console.log('✅ Admin user updated (admin@storify.com / Admin@2024!)')
    }

    // 2. Create demo store owner
    const demoPassword = await bcrypt.hash('Demo@2024!', 12)
    const [existingDemo] = await pool.execute('SELECT id FROM users WHERE email = ?', ['ahmed@example.com'])

    let demoUserId: number
    if ((existingDemo as any[]).length === 0) {
      const [result] = await pool.execute(
        `INSERT INTO users (name, email, password, role, mode, subscription_plan, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        ['Ahmed Mohamed', 'ahmed@example.com', demoPassword, 'user', 'controlled', 'pro', 'active']
      )
      demoUserId = (result as any).insertId
      console.log('✅ Demo user created (ahmed@example.com / Demo@2024!)')
    } else {
      demoUserId = (existingDemo as any[])[0].id
      await pool.execute('UPDATE users SET password = ?, status = ? WHERE email = ?', [demoPassword, 'active', 'ahmed@example.com'])
      console.log('✅ Demo user updated (ahmed@example.com / Demo@2024!)')
    }

    // 3. Create demo stores
    const [existingStores] = await pool.execute('SELECT id FROM stores WHERE user_id = ? AND deleted_at IS NULL', [demoUserId])

    if ((existingStores as any[]).length === 0) {
      const [store1Result] = await pool.execute(
        `INSERT INTO stores (user_id, name, slug, status, base_currency, base_language, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [demoUserId, 'Tech Galaxy', 'tech-galaxy', 'active', 'USD', 'en']
      )
      const store1Id = (store1Result as any).insertId

      const [store2Result] = await pool.execute(
        `INSERT INTO stores (user_id, name, slug, status, base_currency, base_language, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [demoUserId, 'Fashion Hub', 'fashion-hub', 'active', 'USD', 'en']
      )
      const store2Id = (store2Result as any).insertId

      console.log('✅ Demo stores created: Tech Galaxy, Fashion Hub')

      // 4. Create product types
      const [pt1Result] = await pool.execute(
        "INSERT INTO product_types (store_id, name, slug, `schema`, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [store1Id, 'Electronics', 'electronics', JSON.stringify([
          { name: 'Brand', type: 'text', required: true },
          { name: 'Warranty', type: 'number', required: false },
        ])]
      )
      const pt1Id = (pt1Result as any).insertId

      const [pt2Result] = await pool.execute(
        "INSERT INTO product_types (store_id, name, slug, `schema`, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [store2Id, 'Clothing', 'clothing', JSON.stringify([
          { name: 'Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL'] },
          { name: 'Color', type: 'text', required: true },
        ])]
      )
      const pt2Id = (pt2Result as any).insertId

      console.log('✅ Product types created')

      // 5. Create products
      const products = [
        { store: store1Id, pt: pt1Id, title: 'Wireless Earbuds Pro', desc: 'High-quality wireless earbuds with noise cancellation', price: 79.99, discount: 15 },
        { store: store1Id, pt: pt1Id, title: 'Smart Watch X200', desc: 'Feature-packed smartwatch with health monitoring', price: 199.99, discount: 0 },
        { store: store1Id, pt: pt1Id, title: 'Bluetooth Speaker', desc: 'Portable speaker with 360° sound', price: 59.99, discount: 10 },
        { store: store2Id, pt: pt2Id, title: 'Classic Leather Jacket', desc: 'Premium leather jacket for all seasons', price: 249.99, discount: 20 },
        { store: store2Id, pt: pt2Id, title: 'Cotton T-Shirt', desc: 'Comfortable cotton t-shirt', price: 29.99, discount: 0 },
      ]

      const productIds: number[] = []
      for (const p of products) {
        const [result] = await pool.execute(
          `INSERT INTO products (store_id, product_type_id, title, description, price, discount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [p.store, p.pt, p.title, p.desc, p.price, p.discount]
        )
        productIds.push((result as any).insertId)
      }
      console.log(`✅ ${products.length} products created`)

      // 6. Create buyers
      const buyerData = [
        { phone: '+201234567890', name: 'Mohamed Ibrahim', addr: { governorate: 'Cairo', district: 'Nasr City', landmark: 'Near City Stars Mall' } },
        { phone: '+201098765432', name: 'Fatima Hassan', addr: { governorate: 'Alexandria', district: 'Smouha', landmark: 'Behind Green Plaza' } },
        { phone: '+201555555555', name: 'Khaled Mahmoud', addr: { governorate: 'Giza', district: 'Dokki', landmark: 'Tahrir Street' } },
      ]

      const buyerIds: number[] = []
      for (const b of buyerData) {
        const [result] = await pool.execute(
          `INSERT INTO buyers (phone, name, address, total_orders, rejected_orders, risk_level, is_blacklisted, created_at, updated_at)
           VALUES (?, ?, ?, 0, 0, 'low', 0, NOW(), NOW())`,
          [b.phone, b.name, JSON.stringify(b.addr)]
        )
        buyerIds.push((result as any).insertId)
      }
      console.log(`✅ ${buyerData.length} buyers created`)

      // 7. Create orders
      const orderData = [
        { store: store1Id, product: productIds[0], buyer: buyerIds[0], amount: 135.98, status: 'delivered' },
        { store: store1Id, product: productIds[1], buyer: buyerIds[1], amount: 199.99, status: 'confirmed' },
        { store: store2Id, product: productIds[3], buyer: buyerIds[0], amount: 199.99, status: 'pending' },
        { store: store1Id, product: productIds[2], buyer: buyerIds[2], amount: 53.99, status: 'returned' },
        { store: store2Id, product: productIds[4], buyer: buyerIds[1], amount: 29.99, status: 'delivered' },
      ]

      for (const o of orderData) {
        await pool.execute(
          `INSERT INTO orders (store_id, product_id, buyer_id, status, total_amount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY), NOW())`,
          [o.store, o.product, o.buyer, o.status, o.amount]
        )
        // Update buyer order count
        await pool.execute('UPDATE buyers SET total_orders = total_orders + 1 WHERE id = ?', [o.buyer])
      }
      console.log(`✅ ${orderData.length} orders created`)

    } else {
      console.log('ℹ️  Demo stores already exist, skipping data seed')
    }

    console.log('\n🎉 Seed completed successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('   Admin:      admin@storify.com / Admin@2024!')
    console.log('   Store Owner: ahmed@example.com / Demo@2024!')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
