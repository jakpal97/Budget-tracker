import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/db';
import Category from '../../../models/Category';

export default async function handler(req, res) {
  const session = await getSession({ req });

  // Sprawdzenie, czy użytkownik jest zalogowany
  if (!session) {
    return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' });
  }

  // Połączenie z bazą danych
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Błąd połączenia z bazą danych:', error);
    return res.status(500).json({ success: false, message: 'Błąd połączenia z bazą danych' });
  }

  // Obsługa metody GET - pobieranie kategorii
  if (req.method === 'GET') {
    try {
      // Pobieramy wszystkie kategorie użytkownika
      const categories = await Category.find({ userId: session.user.id })
        .sort({ name: 1 })
        .lean();
      
      return res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas pobierania kategorii'
      });
    }
  }

  // Obsługa metody POST - dodawanie nowej kategorii
  if (req.method === 'POST') {
    try {
      const { name, color, icon, budget, budgetPeriod } = req.body;
      
      // Walidacja danych
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nazwa kategorii jest wymagana'
        });
      }
      
      // Sprawdzamy, czy kategoria o takiej nazwie już istnieje
      const existingCategory = await Category.findOne({
        userId: session.user.id,
        name: { $regex: new RegExp(`^${name}$`, 'i') } // Case-insensitive
      });
      
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Kategoria o takiej nazwie już istnieje'
        });
      }
      
      // Tworzymy nową kategorię
      const newCategory = new Category({
        userId: session.user.id,
        name,
        color: color || '#3498db',
        icon: icon || 'tag',
        budget: budget || 0,
        budgetPeriod: budgetPeriod || 'monthly',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Zapisujemy kategorię w bazie danych
      await newCategory.save();
      
      // Zwracamy odpowiedź
      return res.status(201).json({
        success: true,
        data: newCategory,
        message: 'Kategoria została pomyślnie dodana'
      });
    } catch (error) {
      console.error('Błąd podczas dodawania kategorii:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas dodawania kategorii'
      });
    }
  }

  // Obsługa metody PATCH - aktualizacja istniejącej kategorii
  if (req.method === 'PATCH') {
    try {
      const { id, ...updateData } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Brakuje identyfikatora kategorii'
        });
      }
      
      // Sprawdzamy, czy kategoria należy do użytkownika
      const category = await Category.findOne({
        _id: id,
        userId: session.user.id
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategoria nie została znaleziona'
        });
      }
      
      // Jeśli to kategoria domyślna, nie pozwalamy zmienić niektórych pól
      if (category.isDefault) {
        delete updateData.isDefault; // Nie można zmienić statusu domyślności
      }
      
      // Aktualizujemy kategorię
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
      
      return res.status(200).json({
        success: true,
        data: updatedCategory,
        message: 'Kategoria została pomyślnie zaktualizowana'
      });
    } catch (error) {
      console.error('Błąd podczas aktualizacji kategorii:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas aktualizacji kategorii'
      });
    }
  }

  // Obsługa metody DELETE - usuwanie kategorii
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Brakuje identyfikatora kategorii'
        });
      }
      
      // Sprawdzamy, czy kategoria należy do użytkownika
      const category = await Category.findOne({
        _id: id,
        userId: session.user.id
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategoria nie została znaleziona'
        });
      }
      
      // Nie pozwalamy usunąć kategorii domyślnej
      if (category.isDefault) {
        return res.status(403).json({
          success: false,
          message: 'Nie można usunąć kategorii domyślnej'
        });
      }
      
      // Usuwamy kategorię
      await Category.findByIdAndDelete(id);
      
      return res.status(200).json({
        success: true,
        message: 'Kategoria została pomyślnie usunięta'
      });
    } catch (error) {
      console.error('Błąd podczas usuwania kategorii:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas usuwania kategorii'
      });
    }
  }

  // Jeśli metoda nie jest obsługiwana
  return res.status(405).json({
    success: false,
    message: 'Metoda nie jest obsługiwana'
  });
}