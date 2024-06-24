package Web::Components::Model;

use Web::ComposableRequest::Constants qw( EXCEPTION_CLASS FALSE NUL TRUE );

use HTTP::Status          qw( HTTP_OK HTTP_INTERNAL_SERVER_ERROR );
use Unexpected::Types     qw( LoadableClass Str );
use Unexpected::Functions qw( BadToken NoMethod );
use Web::Components::Util qw( exception throw );
use Scalar::Util          qw( blessed );
use Moo;

# Public attributes
has 'context_class' =>
   is       => 'lazy',
   isa      => LoadableClass,
   coerce   => TRUE,
   required => TRUE;

has 'navigation_key' => is => 'ro', isa => Str, default => 'nav';

# Public methods
# Stash exception handler output to print an exception page
# Also called by component loader if model dies
sub error {
   my ($self, $context, $proto, $bindv, @args) = @_;

   my $exception;

   if (blessed $proto) { $exception = $proto }
   else {
      $exception = exception $proto, $bindv // [], level => 2, @args;
   }

   $self->log->error($exception, $context) if $self->can('log');

   my $code = $exception->rv || HTTP_INTERNAL_SERVER_ERROR;
   my $nav  = $context->stash($self->navigation_key);

   $code = HTTP_OK if $nav && $nav->is_script_request;

   $context->stash(
      code      => $code,
      exception => $exception,
      page      => { %{$self->config->page}, layout => 'page/exception' },
   );

   $self->_finalise_stash($context);

   $nav->finalise_script_request if $nav;

   return;
}

sub execute { # Called by component loader for all model method calls
   my ($self, $context, $methods) = @_;

   my $stash   = $context->stash;
   my $nav_key = $self->navigation_key;
   my $last_method;

   $stash->{method_chain} = $methods;

   for my $method (split m{ / }mx, $methods) {
      my $coderef = $self->can($method)
         or throw NoMethod, [blessed $self, $method];

      $method = NUL unless $self->is_authorised($context, $coderef);

      $self->$method($context, @{$context->request->args}) if $method;

      return $stash->{response} if $stash->{response};

      $stash->{$nav_key}->finalise_script_request if exists $stash->{$nav_key};

      return if $stash->{finalised} || exists $stash->{redirect};

      $last_method = $method;
   }

   $self->_finalise_stash($context, $last_method);
   return;
}

sub get_context { # Creates and returns a new context object from the request
   my ($self, $args) = @_;

   return $self->context_class->new({ %{$args}, config => $self->config });
}

sub verify_form_post { # Stash an exception if the CSRF token is bad
   my ($self, $context) = @_;

   my $reason = $context->verify_form_post;

   return TRUE unless $reason;

   $self->error($context, BadToken, [$reason], level => 3);
   return FALSE;
}

# Private methods
sub _finalise_stash { # Add necessary defaults for the view to render
   my ($self, $context, $method) = @_;

   my $stash = $context->stash;

   $stash->{code} //= HTTP_OK unless exists $stash->{redirect};
   $stash->{finalised} = TRUE;
   $stash->{page} //= { %{$self->config->page} };
   $stash->{page}->{layout} //= $self->moniker . "/${method}";
   $stash->{view} //= $self->config->default_view;
   return;
}

use namespace::autoclean;

1;

__END__

=pod

=encoding utf-8

=head1 Name

Web::Components::Model - Base class for Web Component models

=head1 Synopsis

   use Moo;

   extends 'Web::Components::Model';

=head1 Description

Base class for Web Component models

=head1 Configuration and Environment

Defines the following attributes;

=over 3

=item context_class

=item navigation_key

=back

=head1 Subroutines/Methods

Defines the following methods;

=over 3

=item error

=item execute

=item get_context

=item verify_form_post

=back

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<Web::ComposableRequest>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <pjfl@cpan.org> >>

=head1 License and Copyright

Copyright (c) 2024 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
