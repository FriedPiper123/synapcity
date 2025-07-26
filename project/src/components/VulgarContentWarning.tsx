import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VulgarContentWarningProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message?: string;
  description?: string;
}

export default function VulgarContentWarning({ 
  visible, 
  onDismiss, 
  title = "⚠️ Content Warning",
  message = "Posting vulgar content is against our policy.",
  description = "Vulgarity is not allowed. Strict action will be taken if this happens again."
}: VulgarContentWarningProps) {
  return (
    <Dialog open={visible} onOpenChange={onDismiss}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-semibold text-gray-900">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-center text-gray-700 leading-relaxed">
            {message}
          </p>
          
          <p className="text-center text-sm text-gray-500 leading-relaxed">
            {description}
          </p>
          
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onDismiss}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg font-medium"
            >
              I Understand
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 