import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/db';
import { SavingGoal } from '../../../models/Budget';

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

  // Obsługa metody GET - pobieranie celów oszczędnościowych
  if (req.method === 'GET') {
    try {
      // Pobieramy wszystkie cele oszczędnościowe użytkownika
      const goals = await SavingGoal.find({ 
        userId: session.user.id
      })
      .sort({ targetDate: 1 })
      .lean();
      
      // Obliczamy procent ukończenia i dzienne oszczędności dla każdego celu
      const goalsWithStats = goals.map(goal => {
        const completion = (goal.currentAmount / goal.targetAmount) * 100;
        
        const now = new Date();
        const targetDate = new Date(goal.targetDate);
        const daysLeft = Math.max(1, Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)));
        const amountLeft = goal.targetAmount - goal.currentAmount;
        const dailySavingsNeeded = amountLeft / daysLeft;
        
        return {
          ...goal,
          completion,
          daysLeft,
          dailySavingsNeeded
        };
      });
      
      return res.status(200).json({
        success: true,
        data: goalsWithStats
      });
    } catch (error) {
      console.error('Błąd podczas pobierania celów oszczędnościowych:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas pobierania celów oszczędnościowych'
      });
    }
  }

  // Obsługa metody POST - dodawanie nowego celu oszczędnościowego
  if (req.method === 'POST') {
    try {
      const { 
        name, 
        targetAmount, 
        currentAmount, 
        targetDate, 
        category, 
        description, 
        icon, 
        color 
      } = req.body;
      
      // Walidacja danych
      if (!name || !targetAmount || !targetDate) {
        return res.status(400).json({
          success: false,
          message: 'Nazwa, kwota docelowa i data docelowa są wymagane'
        });
      }
      
      // Walidacja kwoty
      const parsedTargetAmount = parseFloat(targetAmount);
      const parsedCurrentAmount = parseFloat(currentAmount || 0);
      
      if (isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Kwota docelowa musi być liczbą większą od zera'
        });
      }
      
      // Walidacja daty
      const targetDateObj = new Date(targetDate);
      if (isNaN(targetDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Nieprawidłowy format daty docelowej'
        });
      }
      
      // Tworzymy nowy cel oszczędnościowy
      const newGoal = new SavingGoal({
        userId: session.user.id,
        name,
        targetAmount: parsedTargetAmount,
        currentAmount: parsedCurrentAmount,
        currency: 'PLN',
        startDate: new Date(),
        targetDate: targetDateObj,
        category: category || 'Oszczędności',
        description: description || '',
        isCompleted: parsedCurrentAmount >= parsedTargetAmount,
        icon: icon || 'piggy-bank',
        color: color || '#27ae60',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Zapisujemy cel w bazie danych
      await newGoal.save();
      
      // Zwracamy odpowiedź
      return res.status(201).json({
        success: true,
        data: newGoal,
        message: 'Cel oszczędnościowy został pomyślnie dodany'
      });
    } catch (error) {
      console.error('Błąd podczas dodawania celu oszczędnościowego:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas dodawania celu oszczędnościowego'
      });
    }
  }

  // Obsługa metody PATCH - aktualizacja istniejącego celu oszczędnościowego
  if (req.method === 'PATCH') {
    try {
      const { id, ...updateData } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Brakuje identyfikatora celu oszczędnościowego'
        });
      }
      
      // Sprawdzamy, czy cel należy do użytkownika
      const goal = await SavingGoal.findOne({
        _id: id,
        userId: session.user.id
      });
      
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Cel oszczędnościowy nie został znaleziony'
        });
      }
      
      // Jeśli aktualizujemy kwotę bieżącą, sprawdzamy czy cel został osiągnięty
      if (updateData.currentAmount !== undefined) {
        const currentAmount = parseFloat(updateData.currentAmount);
        const targetAmount = updateData.targetAmount !== undefined 
          ? parseFloat(updateData.targetAmount) 
          : goal.targetAmount;
        
        updateData.isCompleted = currentAmount >= targetAmount;
      }
      
      // Aktualizujemy cel oszczędnościowy
      const updatedGoal = await SavingGoal.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
      
      return res.status(200).json({
        success: true,
        data: updatedGoal,
        message: 'Cel oszczędnościowy został pomyślnie zaktualizowany'
      });
    } catch (error) {
      console.error('Błąd podczas aktualizacji celu oszczędnościowego:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas aktualizacji celu oszczędnościowego'
      });
    }
  }

  // Obsługa metody DELETE - usuwanie celu oszczędnościowego
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Brakuje identyfikatora celu oszczędnościowego'
        });
      }
      
      // Sprawdzamy, czy cel należy do użytkownika
      const goal = await SavingGoal.findOne({
        _id: id,
        userId: session.user.id
      });
      
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Cel oszczędnościowy nie został znaleziony'
        });
      }
      
      // Usuwamy cel oszczędnościowy
      await SavingGoal.findByIdAndDelete(id);
      
      return res.status(200).json({
        success: true,
        message: 'Cel oszczędnościowy został pomyślnie usunięty'
      });
    } catch (error) {
      console.error('Błąd podczas usuwania celu oszczędnościowego:', error);
      return res.status(500).json({
        success: false,
        message: 'Wystąpił błąd podczas usuwania celu oszczędnościowego'
      });
    }
  }

  // Jeśli metoda nie jest obsługiwana
  return res.status(405).json({
    success: false,
    message: 'Metoda nie jest obsługiwana'
  });
}