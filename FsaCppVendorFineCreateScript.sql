SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[FsaCppVendorFinePayment](
	[id] [numeric](18, 0) IDENTITY(1,1) NOT NULL,
	[vendorFineId] [numeric](18, 0) NOT NULL,
	[checkNumber] [nvarchar](25) NULL,
	[paymentDate] [date] NULL,
	[paymentAmount] [money] NOT NULL,
	[comments] [nvarchar](1500) NULL,
	[updatedBy] [nvarchar](50) NULL,
	[updateDate] [datetime] NULL,
	[createdBy] [nvarchar](50) NULL,
	[createdDate] [datetime] NULL,
 CONSTRAINT [PK_FsaCppVendorFinePayment] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[FsaCppVendorFinePayment]  WITH CHECK ADD  CONSTRAINT [FK_fines_payments] FOREIGN KEY([vendorFineId])
REFERENCES [dbo].[FsaCppVendorFine] ([id])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[FsaCppVendorFinePayment] CHECK CONSTRAINT [FK_fines_payments]
GO
